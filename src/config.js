export let mintingIntervalIds = {};
export let buyingIntervalIds = [];
export let executionQueue = [];
export let isProcessingBuyQueue = false;
export let isProcessingMintQueue = {};
export let targetTokenIds;
export let mintedTokens = [];
export const boughtTokenIds = new Set(); 

export function getTargetTokenIds(){
    if (process.env.TOKEN_ID && process.env.TOKEN_ID !== "SWEEP" && process.env.TOKEN_ID !== "AUTO") {
        targetTokenIds = new Set(process.env.TOKEN_ID.split(',').map(id => parseInt(id.trim(), 10)));
    }
}

export function addBoughtTokenId(tokenId) {
    boughtTokenIds.add(tokenId);
}

export function getBoughtTokenCount() {
    return boughtTokenIds.size;
}

export function clearMintedTokens(){
    mintedTokens.length = 0;
}

export function clearBoughtTokenIds(){
    boughtTokenIds.clear();
}

export function clearBuyingIntervalIds(){
    while (buyingIntervalIds.length > 0) {
        const intervalId = buyingIntervalIds.pop();
        clearInterval(intervalId);
      }
    console.log('Buying intervals cleared. Length is now:'+ buyingIntervalIds.length);
}

export function updateProcessingMintQueueStatus(value, senderAddress) {
    isProcessingMintQueue[senderAddress]= value; 
}

export function updateProcessingBuyQueueStatus(value) {
    isProcessingBuyQueue = value; 
}

export function addMintedTokenSuccess(token) {
    mintedTokens.push(token);
}

export function removeWallet(senderAddress){
    if (mintingIntervalIds[senderAddress]) {
        clearInterval(mintingIntervalIds[senderAddress]);
        delete mintingIntervalIds[senderAddress];
    }
}

export function clearMintingIntervalIds() {
    for (const address in mintingIntervalIds) {
        if (Object.hasOwnProperty.call(mintingIntervalIds, address)) {
            clearInterval(mintingIntervalIds[address]);
            delete mintingIntervalIds[address];
        }
    }
    console.log('Minting intervals cleared. Length is now: ' + Object.keys(mintingIntervalIds).length);
}