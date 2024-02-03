import { clearAllIntervals, getMintDetailsFromUrl, getCollectionConfig, getHashedAddress} from './helpers.js';
import { generateMerkleProof, generateMerkleRoot, isMatchingMerkle } from './merkle.js';
import { isProcessingQueue, executionQueue, updateProcessingQueueStatus, mintedTokens, addMintedTokenSuccess } from './config.js';

const lightHouseContractAddress = "sei1hjsqrfdg2hvwl3gacg4fkznurf36usrv7rkzkyh29wz3guuzeh0snslz7d";
const frankenFrensFeeAddress = "sei1t403lg45sl5n02jlah7zjaw2rdtuayh4nfh352";
const frankenFrensFeeAmount = "100000"; //0.1 SEI per successful mint
const mintLimitTotal = parseInt(process.env.MINT_LIMIT_TOTAL, 10);

export async function mintSneiper(senderAddress, needsToPayFee, signingCosmWasmClient) {
    try {
      if(!isProcessingQueue){
        const current_time = Math.floor(Date.now() / 1000);
        updateProcessingQueueStatus(true);
        console.log(`Retrieving mint details from ${process.env.MINT_URL}`)
        const mintDetails = await getMintDetailsFromUrl(process.env.MINT_URL);
        if(mintDetails){
            console.log(`Mint details found..\nCollection Name: ${mintDetails.u2}\nContract Address: ${mintDetails.s_}`);
            console.log("Getting collection config...");
            const collectionConfig = await getCollectionConfig(mintDetails.s_, signingCosmWasmClient);
            const contractAddress = mintDetails.s_;
            let hashedAddress = null;
            if(collectionConfig){
              console.log(`Collection config found...`);

                //Handle Allow list first
                for (const allowlistDetail of mintDetails.Xx) {
                  if(allowlistDetail.allowlist == null || allowlistDetail.allowlist.length === 0)
                  {
                    continue;
                  }
                  const senderMerkleRoot = generateMerkleRoot(allowlistDetail.allowlist, senderAddress);
                  if (!senderMerkleRoot) {
                      console.log(`Your address ${senderAddress} is not in the allowlist: ${allowlistDetail.name}`);
                      continue; 
                  }

                  const group = collectionConfig.mint_groups.find(g => g.merkle_root && isMatchingMerkle(senderMerkleRoot, g.merkle_root));
                  
                  if (group) {
                      console.log(`Matching mint group found for allowlist: ${allowlistDetail.name}`);
                      const isMintPhaseCurrent = current_time >= group.start_time && (group.end_time === 0 || current_time <= group.end_time);
                      
                      if (isMintPhaseCurrent) {
                          console.log(`Mint phase current for group: ${group.name}!`);
                          const merkleProof = generateMerkleProof(allowlistDetail.allowlist, senderAddress);
                          executionQueue.push({
                              senderAddress, 
                              hashedAddress: getHashedAddress(senderAddress), 
                              merkleProof, 
                              contractAddress, 
                              groupName: group.name, 
                              unitPrice: group.unit_price, 
                              needsToPayFee, 
                              signingCosmWasmClient
                          });
                          await processQueue();
                      } else {
                          console.log(`Mint phase not current for group: ${group.name}!`);
                      }
                  } else {
                      console.log(`No matching mint group found for allowlist with generated Merkle root.`);
                  }
                }

                //Handle public
                for (const group of collectionConfig.mint_groups) {
                  if (group.merkle_root === null) {
                      const isMintPhaseCurrent = current_time >= group.start_time && (group.end_time === 0 || current_time <= group.end_time);
                      if (isMintPhaseCurrent) {
                          console.log(`Mint phase current for group: ${group.name}`);
                          executionQueue.push({
                              senderAddress, 
                              hashedAddress: null, 
                              merkleProof: null, 
                              contractAddress, 
                              groupName: group.name, 
                              unitPrice: group.unit_price, 
                              needsToPayFee, 
                              signingCosmWasmClient
                          });
                          await processQueue();
                      } else {
                          console.log(`Mint phase not current for group: ${group.name}`);
                      }
                      continue;
                  }
              }
              updateProcessingQueueStatus(false);
            }
            else{
                console.log(`Collection config not found...`);
                clearAllIntervals();
                process.exit(0);
            }
        }else{
            console.log("Mint details not found...is this a lighthouse mint site?");
            clearAllIntervals();
            process.exit(0);
        }
      }
    } catch (error){
        console.log("Sneipe unsuccessful! " + error.message);
    }
}

export async function processQueue() {
  if (executionQueue.length === 0) {
      return;
  }

  updateProcessingQueueStatus(true);
  const {senderAddress, hashedAddress, merkleProof, contractAddress, groupName, unitPrice, needsToPayFee, signingCosmWasmClient} = executionQueue.shift();
  try{
    console.log("Sneiping...");
    await executeContract(senderAddress, hashedAddress, merkleProof, contractAddress, groupName, unitPrice, needsToPayFee, signingCosmWasmClient);
  } catch (error) {
    console.log("Sneipe unsuccessful! " + error.message);
  } finally {

  }
  updateProcessingQueueStatus(false);
}

export async function executeContract(senderAddress, hashedAddress, merkleProof, contractAddress, groupName, unitPrice, needsToPayFee, signingCosmWasmClient) {
    try {
      const instruction = {
        contractAddress: lightHouseContractAddress,
        msg: {
            mint_native: {
                collection: contractAddress,
                group: groupName,
                recipient: senderAddress,
                merkle_proof: merkleProof,
                hashed_address: hashedAddress
            }
        }
      };

        const unitPriceNumber = parseFloat(unitPrice);
        const lighthouseFeeNumber = unitPrice == "0" ? parseFloat("0") : parseFloat("1500000"); //if unit price is 0, no light house fee
        const finalAmountWithLighthouseFee = unitPriceNumber + lighthouseFeeNumber; //Add 1.5 SEI for Lighthouse fee
  
        const totalFunds = [{
          denom: 'usei',
          amount: finalAmountWithLighthouseFee.toString()
        }];

        if(unitPrice != "0")
        {
          instruction.funds = totalFunds;
        }
        let instructions = [];

        for(let i = 0; i < process.env.MINT_LIMIT_PER_PHASE; i++)
        {
          instructions.push(instruction);
        }

        const result = await signingCosmWasmClient.executeMultiple(senderAddress, instructions, "auto")
      

        const logs = result.logs
        for (const log of logs) {
            const events = log.events
            for (const event of events) {
                if (event.type === 'wasm') {
                    for (const attribute of event.attributes) {
                        if (attribute.key === 'token_id') {
                            addMintedTokenSuccess(attribute.value);
                            break;
                        }
                    }
                }
            }
        }
        
        if(mintedTokens.length > 0){
          console.log(`Sneipe successful for ${mintedTokens.length} NFTs...Tx hash: ${result.transactionHash}`);
          if(needsToPayFee){
            try {
              const finalFrankenFrensFeeAmount = parseFloat(frankenFrensFeeAmount) * mintedTokens.length;
              const convertedFeeAmount = (finalFrankenFrensFeeAmount / 1000000).toString();
              console.log(`You do not hold enough FrankenFrens...A fee of ${convertedFeeAmount} SEI is being sent as there were ${mintedTokens.length} succesful mints...`)
              const feeFunds = [{
                denom: 'usei',
                amount: finalFrankenFrensFeeAmount.toString()
              }];
              const feeResult = await signingCosmWasmClient.sendTokens(senderAddress, frankenFrensFeeAddress, feeFunds, "auto", "fee for FrankenFrens mint sniper");
              if(feeResult.transactionHash){
                console.log("FrankenFrens fee sent. Thank you.")
              }
              else{
                console.log("FrankenFrens fee not sent due to an issue. You have not been charged.")
              }
            }catch (error){
              console.log("FrankenFrens fee transfer unsuccesful: " + error.message + ". You have not been charged.");
            }finally {
           
            }
          }
        }else {
          console.log("Sneipe unsuccessful!")
        }
      } catch (error) {
        console.log("Sneipe unsuccessful! " + error.message);
        if(error.message.toUpperCase().includes("SOLD OUT"))
        {
          console.log("Collection SOLD OUT. Exiting...");
          clearAllIntervals();
          process.exit(0);
        }
      } finally {

      }

      if (mintedTokens.length >=  mintLimitTotal) {
        console.log("All tokens have been successfully bought. Exiting...");
        clearAllIntervals();
        process.exit(0);
      }
  }