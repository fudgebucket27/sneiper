import { pollingIntervalIds } from './config.js';
import { getHoldings, getMintDetailsFromUrl, getCollectionConfig, getHashedAddress} from './helpers.js';
import { generateMerkleProof } from './merkle.js';
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
            const isHolder = await getHoldings(senderAddress);
            let needsToPayFee = true;
            if(isHolder >= 5){
                console.log("You hold at least 5 FrankenFrens so you will not be charged any fees for every successful mint!");
                needsToPayFee = false;
            } else {
                console.log("You do not hold at least 5 FrankenFrens so a fee of 0.1 SEI will be charged for every successful mint!");
            }
            console.log(`Retrieving mint details from ${process.env.MINT_URL}`)
            const mintDetails = await getMintDetailsFromUrl(process.env.MINT_URL);
            if(mintDetails){
                console.log(`Mint details found..\nCollection Name: ${mintDetails.u2}\nContract Address: ${mintDetails.s_}`);
                console.log("Getting collection config...");
                const collectionConfig = await getCollectionConfig(mintDetails.s_);
                const hashedAddress = getHashedAddress(senderAddress);
                if(collectionConfig){
                    console.log(`Collection config found...`);
                    collectionConfig.mint_groups.forEach((group) => {
                            const allowlistDetails = mintDetails.Xx.find(element => element.name === group.name);
                            
                            console.log(`Found mint group: ${allowlistDetails.name}`);
                            generateMerkleProof(allowlistDetails?.allowlist ?? [], senderAddress);
                            if(group.merkle_root !== "" && group.merkle_root !== null )
                            {

                            }
                    });
                }
                else{
                    console.log(`Collection config not found...`);
                }

            }else{
                console.log("Mint details not found...is this a lighthouse mint site?")
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
        console.error("Error: " + error.message);
    }
}

main();
