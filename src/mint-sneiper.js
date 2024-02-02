import { clearAllIntervals, getMintDetailsFromUrl, getCollectionConfig, getHashedAddress} from './helpers.js';
import { generateMerkleProof } from './merkle.js';
import { getSigningCosmWasmClient } from "@sei-js/core";
import { boughtTokenIds, isProcessingQueue, executionQueue, updateProcessingQueueStatus, targetTokenIds } from './config.js';

export async function mintSneiper(senderAddress, restoredWallet,needsToPayFee) {
    try {
      if(!isProcessingQueue){
        updateProcessingQueueStatus(true);
        console.log(`Retrieving mint details from ${process.env.MINT_URL}`)
        const mintDetails = await getMintDetailsFromUrl(process.env.MINT_URL);
        if(mintDetails){
            console.log(`Mint details found..\nCollection Name: ${mintDetails.u2}\nContract Address: ${mintDetails.s_}`);
            console.log("Getting collection config...");
            const collectionConfig = await getCollectionConfig(mintDetails.s_);
            const hashedAddress = getHashedAddress(senderAddress);
            if(collectionConfig){
              console.log(`Collection config found...`);
              for (const group of collectionConfig.mint_groups) {
                  const allowlistDetails = mintDetails.Xx.find(element => element.name === group.name);
                  if (allowlistDetails) {
                      console.log(`Found mint group: ${allowlistDetails.name}`);
                      if (group.merkle_root !== "" && group.merkle_root !== null) {
                          const merkleproof = generateMerkleProof(allowlistDetails.allowlist, senderAddress);                          
                          executionQueue.push({ senderAddress, restoredWallet });
                          await processQueue();
                      } else {
                          console.log("No allow list for group..");
                          executionQueue.push({ senderAddress, restoredWallet });
                          await processQueue();
                      }
                  }
              }
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
  const { senderAddress, restoredWallet } = executionQueue.shift();
  
  try {
      console.log("Processing queue");
    
  } catch (error) {
      console.log("Sneipe unsuccessful! " + error.message);
  } finally {
      updateProcessingQueueStatus(false);
  }
}

  
  export async function executeContract(senderAddress, palletListingResponseData, restoredWallet) {
    try {
        const msg =  {
          "buy_now": {
              "expected_price": {
                  "amount": palletListingResponseData.tokens[0].auction.price[0].amount,
                  "denom": "usei"
              },
              "nft": {
                  "address": process.env.CONTRACT_ADDRESS,
                  "token_id": palletListingResponseData.tokens[0].id
              }
          }
      };
  
        const amountString = palletListingResponseData.tokens[0].auction.price[0].amount;
        const amountNumber = parseFloat(amountString);
        const finalPalletAmount = amountNumber + (amountNumber * 0.02); //Add 2% for pallet fee
  
        const totalFunds = [{
          denom: 'usei',
          amount: finalPalletAmount.toString()
        }];
        
        const signingCosmWasmClient = await getSigningCosmWasmClient(process.env.RPC_URL, restoredWallet, {gasPrice: process.env.GAS_LIMIT + "usei"});
        const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", msg, "auto", "sneiper", totalFunds );
        if(result.transactionHash){
          boughtTokenIds.add(palletListingResponseData.tokens[0].id_int);
          console.log("Sneipe successful for token id:" + palletListingResponseData.tokens[0].id_int + ", Tx hash: " + result.transactionHash);
      
          if (boughtTokenIds.size === targetTokenIds.size || boughtTokenIds.size ===  process.env.BUY_LIMIT ) {
              console.log("All tokens have been successfully bought. Exiting...");
              clearAllIntervals();
              process.exit(0);
          }
        }
        else {
          console.log("Sneipe unsuccessful!")
        }
      } catch (error) {
        console.log("Sneipe unsuccessful! " + error.message);
      }
  }
  
  export async function executeContractMultiple(senderAddress, palletListingResponseData, restoredWallet) {
    try {
  
      let batchBids = {
        "batch_bids": {
            "bids": []
        }
      };
      
      const batchBidsSliced = palletListingResponseData.tokens.slice(0, process.env.BUY_LIMIT).map(token => ({
        "bid_type": {
          "buy_now": {
            "expected_price": {
              "amount": token.auction.price[0].amount.toString(),
              "denom": "usei"
            }
          }
        },
        "nft": {
          "address": process.env.CONTRACT_ADDRESS,
          "token_id": token.id_int.toString()
        }
      }));
  
        batchBids.batch_bids.bids = batchBidsSliced;
  
        let totalAmount = 0;
        batchBidsSliced.forEach(bid => {
          let amount = parseFloat(bid.bid_type.buy_now.expected_price.amount);
          totalAmount += amount + (amount * 0.02); // Add amount with 2% fee to total
        });
        const totalFunds = [{
            denom: 'usei',
            amount: totalAmount.toString()
        }];
        const signingCosmWasmClient = await getSigningCosmWasmClient(process.env.RPC_URL, restoredWallet, { gasPrice: process.env.GAS_LIMIT + "usei" });
  
        const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", batchBids, "auto", "sneiper", totalFunds);
  
        if (result.transactionHash) {
            console.log("Sneipe successful! Tx hash: " + result.transactionHash);
            console.log("All tokens have been successfully bought. Exiting...");
            clearAllIntervals();
            process.exit(0);
        } else {
            console.log("Sneipe unsuccessful!");
        }
    } catch (error) {
        console.log("Sneipe unsuccessful! " + error.message);
    }
  }
  
  export async function executeContractAuto(senderAddress, palletListingResponseData, restoredWallet) {
    for (const token of palletListingResponseData.tokens) {
      try {
        const bid = {
          "buy_now": {
            "expected_price": {
              "amount": token.auction.price[0].amount.toString(),
              "denom": "usei"
            },
            "nft": {
              "address": process.env.CONTRACT_ADDRESS,
              "token_id": token.id.toString() 
            }
          }
        };
  
        const amountNumber = parseFloat(token.auction.price[0].amount);
        const finalAmount = amountNumber + (amountNumber * 0.02); // 2% fee
  
        const totalFunds = [{
            denom: 'usei',
            amount: finalAmount.toString()
        }];
  
        const signingCosmWasmClient = await getSigningCosmWasmClient(process.env.RPC_URL, restoredWallet, { gasPrice: process.env.GAS_LIMIT + "usei" });
  
        const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", bid, "auto", "sneiper", totalFunds);
  
        if (result.transactionHash) {
            boughtTokenIds.add(token.id_int);
            const buyLimit = parseInt(process.env.BUY_LIMIT, 10); 
            console.log("Sneipe successful for token id:" + token.id_int + ", Tx hash: " + result.transactionHash);
            if (boughtTokenIds.size ===  buyLimit) {
                console.log("All tokens have been successfully bought. Exiting...");
                clearAllIntervals();
                process.exit(0);
            }
        } else {
            console.log(`Sneipe unsuccessful for token id: ${token.id}`);
        }
      } catch (error) {
        console.log("Sneipe unsuccessful! " + error.message);
      }
    }
  }