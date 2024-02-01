import { getSigningCosmWasmClient } from "@sei-js/core";
import { pollingIntervalIds } from './config.js';

export function isValidListing(palletListingResponseData) {
    if (palletListingResponseData.tokens[0].auction == null || 
        palletListingResponseData.tokens[0].auction.type !== "fixed_price" || 
        palletListingResponseData.tokens[0].auction.price_float > process.env.PRICE_LIMIT) {
        return false;
    } else {
        return true;
    }
}

export function clearAllIntervals() {
    pollingIntervalIds.forEach((id) => clearInterval(id));
}

export async function checkIfHolder(address) {
    try {
        const client = await getSigningCosmWasmClient(process.env.RPC_URL);

        let tokensHeld = await client.queryContractSmart("sei1fxhhxflcxpaexwtu8rsuz3xjd9nzsnxy6uqkz55lare3ev2cc5ws2zdcnr", {
            tokens: {
                owner: address
            }
        });

        console.log("You hold " + tokensHeld.tokens.length + " FrankenFrens.");
        return tokensHeld.tokens.length > 0;
    } catch (error) {
        console.error("Error checking if FrankenFren holder:", error);
        return false;
    }
}
