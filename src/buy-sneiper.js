import {isValidListing, getFormattedTimestamp, updateShouldExitBuyMode, stopBuyingProcess} from './helpers.js';
import { addBoughtTokenId, getBoughtTokenCount, isProcessingBuyQueue, executionQueue, updateProcessingBuyQueueStatus, targetTokenIds, getTargetTokenIds} from './config.js';
import { logMessage } from './helpers.js';

export async function buySneiper(senderAddress, signingCosmWasmClient) {
    try {
      if(!isProcessingBuyQueue)
      {
        if(process.env.TOKEN_ID === "SWEEP" || process.env.TOKEN_ID === "AUTO") {
          const palletListingResponse = await fetch(`https://api.prod.pallet.exchange/api/v2/nfts/${process.env.CONTRACT_ADDRESS}/tokens?token_id_exact=false&buy_now_only=true&timed_auction_only=false&not_for_sale=false&max_price=${process.env.PRICE_LIMIT}&sort_by_price=asc&sort_by_id=asc&page=1&page_size=25`);
          if (!palletListingResponse.ok) {
            let errorMsg = "";
            try {
                const errorData = await palletListingResponse.json();
                errorMsg = errorData.message || JSON.stringify(errorData); 
            } catch (parseError) {
                errorMsg = palletListingResponse.statusText;
            }
            throw new Error(`${getFormattedTimestamp()}:Failed to get pallet listings! ${errorMsg},Retrying...The connection will be re-established!`);
          }
          const palletListingResponseData = await palletListingResponse.json();
          if (palletListingResponseData.count > 0 && !isProcessingBuyQueue) {
            logMessage(`${getFormattedTimestamp()}:Listings valid! Sneiping...`)
            executionQueue.push({ senderAddress, palletListingResponseData, signingCosmWasmClient});
            processQueue();
          }
        } else {
          getTargetTokenIds();
          const tokenIds = process.env.TOKEN_ID.split(',').map(id => parseInt(id.trim(), 10));
  
          for (const tokenId of tokenIds) {
            if (boughtTokenIds.has(tokenId)) {
              continue; // Skip this token id as it's already been bought
            }
            const palletListingResponse = await fetch(`https://api.prod.pallet.exchange/api/v2/nfts/${process.env.CONTRACT_ADDRESS}/tokens?token_id=${tokenId}&token_id_exact=true`);
            if (!palletListingResponse.ok) {
              let errorMsg = "";
              try {
                  const errorData = await palletListingResponse.json();
                  errorMsg = errorData.message || JSON.stringify(errorData); 
              } catch (parseError) {
                  errorMsg = palletListingResponse.statusText;
              }
              throw new Error(`${getFormattedTimestamp()}:Failed to get pallet listing! ${errorMsg},Retrying...The connection will be re-established!`);
            }
            const palletListingResponseData = await palletListingResponse.json();
      
            if (isValidListing(palletListingResponseData) && !isProcessingBuyQueue) {
              logMessage(`${getFormattedTimestamp()}:Listing valid for token id: ${tokenId}! Sneiping...`)
              executionQueue.push({ senderAddress, palletListingResponseData, signingCosmWasmClient});
              processQueue();
            }
          }
        }
      }
    } catch (error){
        logMessage(`${getFormattedTimestamp()}:Sneipe unsuccessful! " + ${error.message}`);
    }
}

export async function processQueue() {
    if (isProcessingBuyQueue || executionQueue.length === 0) {
        return;
    }
  
    updateProcessingBuyQueueStatus(true);
    const { senderAddress, palletListingResponseData, signingCosmWasmClient} = executionQueue.shift();
  
    try {
      if(process.env.TOKEN_ID === "SWEEP"){
        await executeContractMultiple(senderAddress, palletListingResponseData, signingCosmWasmClient);
      }
      if(process.env.TOKEN_ID === "AUTO"){
        await executeContractAuto(senderAddress, palletListingResponseData, signingCosmWasmClient);
      }
      else{
        await executeContract(senderAddress, palletListingResponseData, signingCosmWasmClient);
      }
    } catch (error) {
        logMessage(getFormattedTimestamp() + ":Sneipe unsuccessful! " + error.message);
    } finally {
       updateProcessingBuyQueueStatus(false);
       processQueue();
    }
  }
  
  export async function executeContract(senderAddress, palletListingResponseData, signingCosmWasmClient) {
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
        
        const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", msg, "auto", "sneiper", totalFunds );
        if(result.transactionHash){
          addBoughtTokenId(palletListingResponseData.tokens[0].id_int);
          logMessage(getFormattedTimestamp() + ":Sneipe successful for token id:" + palletListingResponseData.tokens[0].id_int + ", Tx hash: " + result.transactionHash);
      
          if (getBoughtTokenCount() >= targetTokenIds.size || getBoughtTokenCount() >=  process.env.BUY_LIMIT ) {
              logMessage(getFormattedTimestamp() + ":All tokens have been successfully bought. Exiting...");
              stopBuyingProcess();
              updateShouldExitBuyMode(true);
              return;
              
              //clearBuyingIntervalIds();
              //process.exit(0);
          }
        }
        else {
          logMessage(getFormattedTimestamp() + ":Sneipe unsuccessful!")
        }
      } catch (error) {
        logMessage(getFormattedTimestamp() + ":Sneipe unsuccessful! " + error.message);
        if(error.message.toUpperCase().includes("IS SMALLER THAN"))
        {
          logMessage(getFormattedTimestamp() + ":You do not have enough funds. Exiting!");
          stopBuyingProcess();
          updateShouldExitBuyMode(true);
          return;
        }
      }
  }
  
  export async function executeContractMultiple(senderAddress, palletListingResponseData, signingCosmWasmClient) {
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

        const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", batchBids, "auto", "sneiper", totalFunds);
  
        if (result.transactionHash) {
            logMessage(getFormattedTimestamp() + ":Sneipe successful! Tx hash: " + result.transactionHash);
            logMessage(getFormattedTimestamp() + ":All tokens have been successfully bought. Exiting...");
            stopBuyingProcess();
            updateShouldExitBuyMode(true);  
            return;
        } else {
            logMessage(getFormattedTimestamp() + ":Sneipe unsuccessful!");
        }
    } catch (error) {
        logMessage(getFormattedTimestamp() + ":Sneipe unsuccessful! " + error.message);
        if(error.message.toUpperCase().includes("IS SMALLER THAN"))
        {
          logMessage(getFormattedTimestamp() + ":You do not have enough funds. Exiting!");
          stopBuyingProcess();
          updateShouldExitBuyMode(true);
          return;
        }
    }
  }
  
  export async function executeContractAuto(senderAddress, palletListingResponseData, signingCosmWasmClient) {
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
   
        const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", bid, "auto", "sneiper", totalFunds);
  
        if (result.transactionHash) {
            addBoughtTokenId(token.id_int);
            const buyLimit = parseInt(process.env.BUY_LIMIT, 10); 
            logMessage(getFormattedTimestamp() + ":Sneipe successful for token id:" + token.id_int + ", Tx hash: " + result.transactionHash);
            if (getBoughtTokenCount() >=  buyLimit) {
                logMessage(getFormattedTimestamp() + ":All tokens have been successfully bought. Exiting...");
                stopBuyingProcess();
                updateShouldExitBuyMode(true);
                return;
            }
        } else {
            logMessage(getFormattedTimestamp() + `:Sneipe unsuccessful for token id: ${token.id}`);
        }
      } catch (error) {
        logMessage(getFormattedTimestamp() + ":Sneipe unsuccessful! " + error.message);
        if(error.message.toUpperCase().includes("IS SMALLER THAN"))
        {
          logMessage(getFormattedTimestamp() + ":You do not have enough funds. Exiting!");
          stopBuyingProcess();
          updateShouldExitBuyMode(true);
          return;
        }
      }
    }
  }