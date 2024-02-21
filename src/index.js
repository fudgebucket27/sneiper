import { mintingIntervalIds, addBuyingIntervalIds} from './config.js';
import { getHoldings, logMessage, getFormattedTimestamp} from './helpers.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { buySneiper } from './buy-sneiper.js';
import { mintSneiper } from './mint-sneiper.js';
import { restoreWallet } from "@sei-js/core";
import { getSigningCosmWasmClient } from "@sei-js/core";
import {fromHex} from "@cosmjs/encoding";
import {DirectSecp256k1Wallet} from "@cosmjs/proto-signing";

async function processConfig(config) {
    try {
        let restoredWallet = null;
        let senderAddress = null;

        if (config.includes(' ')) { // Recovery phrase
            restoredWallet = await restoreWallet(config);
            const accounts = await restoredWallet.getAccounts();
            senderAddress = accounts[0].address;
        } else { // Private key
            const privateKeyUint8array = fromHex(config.substring(2));
            restoredWallet = await DirectSecp256k1Wallet.fromKey(privateKeyUint8array, "sei");
            const [accounts] = await restoredWallet.getAccounts();
            senderAddress = accounts.address;
        }

        const signingCosmWasmClient = await getSigningCosmWasmClient(process.env.RPC_URL, restoredWallet, {gasPrice: process.env.GAS_LIMIT + "usei"});

        if(process.env.MODE === 'MINT'){
            logMessage(`${senderAddress},${getFormattedTimestamp()}:Sneiper in MINT mode`);
            logMessage(`${senderAddress},${getFormattedTimestamp()}:Checking if you hold any FrankenFrens...`);
            const isHolder = await getHoldings(senderAddress, signingCosmWasmClient);
            let needsToPayFee = true;
            if(isHolder >= 5){
                logMessage(`${senderAddress},${getFormattedTimestamp()}:You hold at least 5 FrankenFrens so you will not be charged any fees for every successful mint`);
                needsToPayFee = false;
            } else {
                logMessage(`${senderAddress},${getFormattedTimestamp()}:You do not hold at least 5 FrankenFrens so a fee of 0.1 SEI will be charged for every successful mint!`);
            }
            const pollingFrequency = parseFloat(process.env.POLLING_FREQUENCY) * 1000;
            if (!isNaN(pollingFrequency) && pollingFrequency > 0) {

                mintingIntervalIds[senderAddress] = setInterval(async () => await mintSneiper(senderAddress, needsToPayFee, signingCosmWasmClient), pollingFrequency);
            } else {
                console.error("Invalid POLLING_FREQUENCY. Please set a valid number in seconds");
            }
        } else if (process.env.MODE === "BUY"){
            logMessage(`${senderAddress},${getFormattedTimestamp()}:Sneiper in BUY mode:` 
             + "\nwith contract address: " + process.env.CONTRACT_ADDRESS 
             + "\nwith token id: " + process.env.TOKEN_ID 
             + "\nwith buy limit: " + process.env.BUY_LIMIT 
             + "\nwith price limit: " + process.env.PRICE_LIMIT 
             + "\nwith gas limit: " + process.env.GAS_LIMIT 
             + "\nwith polling frequency: " + process.env.POLLING_FREQUENCY
            );
            logMessage(`\n${senderAddress},${getFormattedTimestamp()}:Sneiper watching marketplace listings...`);
            const pollingFrequency = parseFloat(process.env.POLLING_FREQUENCY) * 1000;
            if (!isNaN(pollingFrequency) && pollingFrequency > 0) {
                const intervalId = setInterval(async () => await buySneiper(senderAddress, signingCosmWasmClient), pollingFrequency);
                addBuyingIntervalIds(intervalId);
            } else {
                console.error("Invalid POLLING_FREQUENCY. Please set a valid number in seconds");
            }
        } else {
            logMessage("Invalid MODE! Try BUY or MINT");
        }
    } catch (error) {
        console.error("Error processing config: " + error.message);
    }
}

export async function main() {
    reloadEnv();
    let walletConfigs = process.env.RECOVERY_PHRASE ? process.env.RECOVERY_PHRASE.split(',') : [];
    if(process.env.MODE === 'MINT'){
        await Promise.allSettled(walletConfigs.map(config => processConfig(config.trim())));
    }else {
        await walletConfigs.map(config => processConfig(config.trim()))
    }
}

const reloadEnv = () => {
    const envConfig = dotenv.parse(fs.readFileSync('.env'))

    for (const key in envConfig) {
        process.env[key] = envConfig[key]
    }
}
