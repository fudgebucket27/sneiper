import {configDotenv} from "dotenv";

import { restoreWallet,  getSigningCosmWasmClient} from "@sei-js/core";

async function main() {
    configDotenv.apply(); //Get .env file 
    const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE); //restore wallet from .env RECOVERY_PHRASE
    const accounts = await restoredWallet.getAccounts(); //get accounts
    const senderAddress = accounts[0].address; //get address

    const msg =  {
        "buy_now": {
            "expected_price": {
                "amount": "400000",
                "denom": "usei"
            },
            "nft": {
                "address": "sei1faqw953tzda4qvr37wnjpr99t0hx6nqeknrf9c03gzrjvm764huqgvspst",
                "token_id": "3490"
            }
        }
    };

    const totalFunds = [{
      denom: 'usei',
      amount: "408000" //Add 2% for pallet fee
    }];

    const signingCosmWasmClient = await getSigningCosmWasmClient(process.env.RPC_URL, restoredWallet, {gasPrice: "0.1usei"});
    try {
      console.log("Sneiper executing...");
      const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", msg, "auto", "sneiper", totalFunds );
      if(result.transactionHash){
        console.log("Sneipe successful! Tx hash: " + result.transactionHash);
      }
      else {
        console.log("Sneipe unsuccessful!")
      }

 
    } catch (error){
        console.log("Snipe unsuccessful! " + error.message);
    }
}

main();