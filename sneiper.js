import {configDotenv} from "dotenv";

import { restoreWallet } from "@sei-js/core";

async function main() {
    configDotenv.apply();
    const restoredWallet = await restoreWallet(process.env.RECOVERY_PHRASE);
    const accounts = await restoredWallet.getAccounts();
    console.log(accounts[0].address);
}

main();