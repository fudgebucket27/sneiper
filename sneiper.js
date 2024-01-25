import {configDotenv} from "dotenv";

import { restoreWallet } from "@sei-js/core";

import { calculateFee } from '@cosmjs/stargate';

import { getSigningCosmWasmClient } from "@sei-js/core";

async function main() {
    configDotenv.apply(); //Get .env file 
    const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE); //restore wallet from .env RECOVERY_PHRASE
    const accounts = await restoredWallet.getAccounts(); //get accounts
    const senderAddress = accounts[0].address; //get address

    const fee = calculateFee(600000, "0.6") //this is the gas limit

    const result = await restoredWallet.getSigningCosmWasmClient(process.env.RPC_URL);

}

main();