import {configDotenv} from "dotenv";
import { restoreWallet,  getSigningCosmWasmClient} from "@sei-js/core";
configDotenv.apply(); //Get .env file 

const pollingIntervalIds = []; // Array to hold all polling interval IDs


async function sneiper(senderAddress) {
    try {
      console.log("Sneiper executing...");
      const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE); //restore wallet from .env RECOVERY_PHRASE
      const accounts = await restoredWallet.getAccounts(); //get accounts
      const senderAddress = accounts[0].address; //get address

      //Getting data from pallet API
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

      //Executing the pallet smart contract
      if(palletListingResponseData.tokens[0].auction == null)
      {
        throw new Error("There is no listing for this NFT!");
      }

      if(palletListingResponseData.tokens[0].auction.type !== "fixed_price")
      {
        throw new Error("The listing for this NFT is not buy now!");
      }

      if(palletListingResponseData.tokens[0].auction.price_float > process.env.PRICE_LIMIT)
      {
        throw new Error("The listing exceeds the PRICE_LIMIT!");
      }

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
        console.log("Sneipe unsuccessful")
      }
    } catch (error){
        console.log("Snipe unsuccessful! " + error.message);
    }
}

async function main() {
  try {
      const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE); // Restore wallet
      const accounts = await restoredWallet.getAccounts(); // Get accounts
      const senderAddress = accounts[0].address; // Get address

        //Run sneiper based on polling time
        const pollingFrequency = parseInt(process.env.POLLING_FREQUENCY, 10) * 1000;
        if (!isNaN(pollingFrequency) && pollingFrequency > 0) {
          const intervalId = setInterval(() => sneiper(senderAddress), pollingFrequency);
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