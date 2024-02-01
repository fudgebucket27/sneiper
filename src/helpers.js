import { getSigningCosmWasmClient } from "@sei-js/core";
import { pollingIntervalIds } from './config.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const basePath = "static/js"

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

export async function getMintDetailsFromUrl(url){
    const htmlData = await getMintSiteHtml(url);
    if (htmlData) {
        const $ = cheerio.load(htmlData);
        const scripts = $('script[src]').toArray(); // Convert to array for iteration
        for (const element of scripts) {
            const src = $(element).attr('src');
            if (src && src.includes(basePath)) {
                return await getMintDetails(url, src); // Using await within a for...of loop
            }
        }
    }
};

function findMintDetails(jsContent){
    const regex = /const r=JSON\.parse\('((?:\\.|[^'\\])*)'\)/;
    const match = jsContent.match(regex);
    if (match && match.length > 1) {
        // Using match[1] since it's the first capturing group
        const jsonString = match[1].replace(/\\'/g, "'");
        try {
            const jsonObject = JSON.parse(jsonString);
            return jsonObject;
        } catch (error) {
            console.error("Error parsing mint details string:", error);
            return null;
        }
    } else {
        console.log("Mint details not found!");
        return null;
    }
};

async function getMintSiteHtml(url){
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        console.error(`Error fetching HTML from ${url}: ${error}`);
        return null;
    }
};

async function getMintDetails (url, src){
    try {
        const fullUrl = src.startsWith('http') ? src : `${url}${src}`;
        const { data: jsContent } = await axios.get(fullUrl);
        const mintDetails = findMintDetails(jsContent);
        return mintDetails
    } catch (error) {
        console.error(`Failed to process ${src}: ${error.message}`);
        return null;
    }
};


