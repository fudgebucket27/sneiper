import { configDotenv } from "dotenv";
configDotenv.apply(); //Get .env file

export let mintingIntervalIds = {};
export let buyingIntervalIds = [];
export let executionQueue = [];
export let isProcessingBuyQueue = false;
export let isProcessingMintQueue = {};
export let targetTokenIds;
export let mintedTokens = [];
export const boughtTokenIds = new Set(); 
if (process.env.TOKEN_ID !== "SWEEP" && process.env.TOKEN_ID !== "AUTO"){
    targetTokenIds = new Set(process.env.TOKEN_ID.split(',').map(id => parseInt(id.trim(), 10)));
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