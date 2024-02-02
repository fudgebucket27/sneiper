import { configDotenv } from "dotenv";
configDotenv.apply(); //Get .env file

export let pollingIntervalIds = [];
export let executionQueue = [];
export let isProcessingQueue = false;
export let targetTokenIds;
export let mintedTokens = [];
export const boughtTokenIds = new Set(); 
if (process.env.TOKEN_ID !== "SWEEP" && process.env.TOKEN_ID !== "AUTO"){
    targetTokenIds = new Set(process.env.TOKEN_ID.split(',').map(id => parseInt(id.trim(), 10)));
}

export function updateProcessingQueueStatus(value) {
     isProcessingQueue = value; 
}

export function addMintedTokenSuccess(token) {
    mintedTokens.push(token);
}