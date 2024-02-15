import { pollingIntervalIds } from './config.js';
import { getHoldings} from './helpers.js';
import { buySneiper } from './buy-sneiper.js';
import { mintSneiper } from './mint-sneiper.js';
import { restoreWallet } from "@sei-js/core";
import { getSigningCosmWasmClient } from "@sei-js/core";
import {fromHex} from "@cosmjs/encoding";
import {DirectSecp256k1Wallet} from "@cosmjs/proto-signing";

async function main() {
    try {    
        let restoredWallet = null;
        let senderAddress = null
        
        //logic to choose between private key
        if(process.env.RECOVERY_PHRASE.includes(' ')){
            restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE);
            accounts = await restoredWallet.getAccounts();
            senderAddress = accounts[0].address;
        }else{
            const privateKeyUint8array = fromHex(process.env.RECOVERY_PHRASE.substring(2));
            restoredWallet = await DirectSecp256k1Wallet.fromKey(privateKeyUint8array, "sei");
            const [accounts] = await restoredWallet.getAccounts();
            senderAddress = accounts.address;
        }

        const signingCosmWasmClient = await getSigningCosmWasmClient(process.env.RPC_URL, restoredWallet, {gasPrice: process.env.GAS_LIMIT + "usei"});
        // Handle different modes
        if(process.env.MODE === 'MINT'){
            console.log("Sneiper in MINT mode");
            console.log("Checking if you hold any FrankenFrens...");
            const isHolder = await getHoldings(senderAddress, signingCosmWasmClient);
            let needsToPayFee = true;
            if(isHolder >= 5){
                console.log("You hold at least 5 FrankenFrens so you will not be charged any fees for every successful mint!");
                needsToPayFee = false;
            } else {
                console.log("You do not hold at least 5 FrankenFrens so a fee of 0.1 SEI will be charged for every successful mint!");
            }
            const pollingFrequency = parseFloat(process.env.POLLING_FREQUENCY) * 1000;
            if (!isNaN(pollingFrequency) && pollingFrequency > 0) {
                const intervalId = setInterval(() => mintSneiper(senderAddress, needsToPayFee, signingCosmWasmClient), pollingFrequency);
                pollingIntervalIds.push(intervalId);
            } else {
                console.error("Invalid POLLING_FREQUENCY. Please set a valid number in seconds");
            }
        } else if (process.env.MODE === "BUY"){
            console.log("Sneiper in BUY mode:" 
             + "\nwith contract address: " + process.env.CONTRACT_ADDRESS 
             + "\nwith token id: " + process.env.TOKEN_ID 
             + "\nwith buy limit: " + process.env.BUY_LIMIT 
             + "\nwith price limit: " + process.env.PRICE_LIMIT 
             + "\nwith gas limit: " + process.env.GAS_LIMIT 
             + "\nwith polling frequency: " + process.env.POLLING_FREQUENCY
            );
            console.log("\nSneiper watching marketplace listings...");
            const pollingFrequency = parseFloat(process.env.POLLING_FREQUENCY) * 1000;
            if (!isNaN(pollingFrequency) && pollingFrequency > 0) {
                const intervalId = setInterval(() => buySneiper(senderAddress, signingCosmWasmClient), pollingFrequency);
                pollingIntervalIds.push(intervalId);
            } else {
                console.error("Invalid POLLING_FREQUENCY. Please set a valid number in seconds");
            }
        } else {
            console.log("Invalid MODE! Try BUY or MINT");
        }
    } catch (error) {
        console.error("Error: " + error.message);
    }
}

main();
