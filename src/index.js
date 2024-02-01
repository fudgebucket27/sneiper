import { pollingIntervalIds } from './config.js';
import { checkIfHolder} from './helpers.js';
import { sneiper } from './sneiper.js';
import { restoreWallet } from "@sei-js/core";

async function main() {
    try {    
        // Restore wallet
        const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE);
        // Get accounts
        const accounts = await restoredWallet.getAccounts();
        // Get sender address
        const senderAddress = accounts[0].address;
        
        // Handle different modes
        if(process.env.MODE === 'MINT'){
            console.log("Sneiper in MINT mode");
            console.log("Checking if you hold any FrankenFrens...");
            var isHolder = await checkIfHolder(senderAddress);
            if(isHolder){
                console.log("You are a holder so you will not be charged any fees for every successful mint!")
            } else {
                console.log("You are not a holder so a fee of 0.1 SEI will be charged for every successful mint!")
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
                const intervalId = setInterval(() => sneiper(senderAddress, restoredWallet), pollingFrequency);
                pollingIntervalIds.push(intervalId);
            } else {
                console.error("Invalid POLLING_FREQUENCY. Please set a valid number in seconds");
            }
        } else {
            console.log("Invalid MODE! Try BUY or MINT");
        }
    } catch (error) {
        console.error("Error initializing wallet: " + error.message);
    }
}

main();
