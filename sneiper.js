import {configDotenv} from "dotenv";
import { restoreWallet,  getSigningCosmWasmClient} from "@sei-js/core";
configDotenv.apply(); //Get .env file 

const pollingIntervalIds = []; // Array to hold all polling interval IDs
let executionQueue = [];
let isProcessingQueue = false;

async function sneiper(senderAddress, restoredWallet) {
    try {
      //Getting data from pallet API
      if(process.env.TOKEN_ID === "ALL") {
        const palletListingResponse = await fetch("https://api.prod.pallet.exchange/api/v2/nfts/" + process.env.CONTRACT_ADDRESS +"?get_tokens=true&token_id_exact=false&buy_now_only=true&min_price_only=false&not_for_sale=false&less_than_price=" + process.env.PRICE_LIMIT + "&sort_by_price=asc&sort_by_id=asc&page=1&page_size=25");
        if (!palletListingResponse.ok) {
          let errorMsg = "";
          try {
              const errorData = await palletListingResponse.json();
              errorMsg = errorData.message || JSON.stringify(errorData); 
          } catch (parseError) {
              errorMsg = palletListingResponse.statusText;
          }
          throw new Error(`Failed to get pallet listings! ${errorMsg}`);
        }
        const palletListingResponseData = await palletListingResponse.json();
        if (palletListingResponseData.count > 0 && !isProcessingQueue) {
          console.log("Listings valid! Sneiping...")
          executionQueue.push({ senderAddress, palletListingResponseData, restoredWallet });
          processQueue();
        }
      }else {
        const palletListingResponse = await fetch("https://api.prod.pallet.exchange/api/v1/nfts/"+ process.env.CONTRACT_ADDRESS + "?get_tokens=true&token_id=" + process.env.TOKEN_ID + "&token_id_exact=true");
        if (!palletListingResponse.ok) {
          let errorMsg = "";
          try {
              const errorData = await palletListingResponse.json();
              errorMsg = errorData.message || JSON.stringify(errorData); 
          } catch (parseError) {
              errorMsg = palletListingResponse.statusText;
          }
          throw new Error(`Failed to get pallet listing! ${errorMsg}`);
        }
        const palletListingResponseData = await palletListingResponse.json();
  
        if (isValidListing(palletListingResponseData) && !isProcessingQueue) {
          console.log("Listing valid! Sneiping...")
          executionQueue.push({ senderAddress, palletListingResponseData, restoredWallet });
          processQueue();
        }
      }
    } catch (error){
        console.log("Sneipe unsuccessful! " + error.message);
    }
}

function isValidListing(palletListingResponseData) {
      if(palletListingResponseData.tokens[0].auction == null || palletListingResponseData.tokens[0].auction.type !== "fixed_price" || palletListingResponseData.tokens[0].auction.price_float > process.env.PRICE_LIMIT)
      {
        return false;
      }
      else
      {
        return true;
      }
}

async function processQueue() {
  if (isProcessingQueue || executionQueue.length === 0) {
      return;
  }

  isProcessingQueue = true;
  const { senderAddress, palletListingResponseData, restoredWallet } = executionQueue.shift();

  try {
    if(process.env.TOKEN_ID === "ALL"){
      await executeContractMultiple(senderAddress, palletListingResponseData, restoredWallet);
    }
    else{
      await executeContract(senderAddress, palletListingResponseData, restoredWallet);
    }
  } catch (error) {
      console.log("Sneipe unsuccessful! " + error.message);
  } finally {
      isProcessingQueue = false;
      processQueue();
  }
}

async function executeContract(senderAddress, palletListingResponseData, restoredWallet) {
  try {
      const msg =  {
        "buy_now": {
            "expected_price": {
                "amount": palletListingResponseData.tokens[0].auction.price[0].amount,
                "denom": "usei"
            },
            "nft": {
                "address": process.env.CONTRACT_ADDRESS,
                "token_id": process.env.TOKEN_ID
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
        console.log("Sneipe successful! Tx hash: " + result.transactionHash);
        clearAllIntervals(); 
        process.exit(0);
      }
      else {
        console.log("Sneipe unsuccessful!")
      }
    } catch (error) {
      console.log("Sneipe unsuccessful! " + error.message);
    }
}

async function executeContractMultiple(senderAddress, palletListingResponseData, restoredWallet) {
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
          clearAllIntervals();
          process.exit(0);
      } else {
          console.log("Sneipe unsuccessful!");
      }
  } catch (error) {
      console.log("Sneipe unsuccessful! " + error.message);
  }
}

async function main() {
  try {
      console.log("Sneiper watching listings...");
      const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE); // Restore wallet
      const accounts = await restoredWallet.getAccounts(); // Get accounts
      const senderAddress = accounts[0].address; // Get address
        //Run sneiper based on polling time

        const pollingFrequency = parseInt(process.env.POLLING_FREQUENCY, 10) * 1000;
        if (!isNaN(pollingFrequency) && pollingFrequency > 0) {
          const intervalId = setInterval(() => sneiper(senderAddress, restoredWallet), pollingFrequency);
          pollingIntervalIds.push(intervalId);
        } else {
            console.error("Invalid POLLING_FREQUENCY. Please set a valid number in seconds");
        }
    } catch (error) {
      console.error("Error initializing wallet: " + error.message);
  }
}

function clearAllIntervals() {
  pollingIntervalIds.forEach((id) => clearInterval(id));
}

main();