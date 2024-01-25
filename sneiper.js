import {configDotenv} from "dotenv";

import { restoreWallet,  getSigningCosmWasmClient, getCosmWasmClient, SUPPORTED_WALLETS } from "@sei-js/core";

import { calculateFee } from '@cosmjs/stargate';

async function main() {
    configDotenv.apply(); //Get .env file 
    const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE); //restore wallet from .env RECOVERY_PHRASE
    const accounts = await restoredWallet.getAccounts(); //get accounts
    const senderAddress = accounts[0].address; //get address

    const fee = calculateFee(600000, "0.6usei") //this is the gas limit
    const msg =  {
        "buy_now": {
            "expected_price": {
                "amount": "400000",
                "denom": "usei"
            },
            "nft": {
                "address": "sei1faqw953tzda4qvr37wnjpr99t0hx6nqeknrf9c03gzrjvm764huqgvspst",
                "token_id": "2901"
            }
        }
    };

    const signingCosmWasmClient = await getSigningCosmWasmClient(process.env.RPC_URL, restoredWallet);
    try {
      console.log("Sneiper executing...");
      const result = await signingCosmWasmClient.execute(senderAddress, "sei152u2u0lqc27428cuf8dx48k8saua74m6nql5kgvsu4rfeqm547rsnhy4y9", msg, fee);
    } catch (error){
        console.log(error.message);
    }
}

main();