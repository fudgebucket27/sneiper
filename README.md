# sneiper
Snipe NFTs on SEI.

# Features
1. Target a Collection on Pallet and buy specific multiple NFTs that fall under a certain price point
2. Target a Collection on Pallet and buy any multiple NFTs that fall under a certain price point
3. Target a Lighthouse Mint site and mint NFTs. 

# Installation
1. Install node js, npm and git
2. Clone this repo with git, in terminal run:
   ```bash
   git clone https://github.com/fudgebucket27/sneiper
   ```
3. Navigate to the sneiper directory, in terminal run:
   ```bash
   cd sneiper
   ```
4. Install dependencies, in terminal run:
   ```bash
   npm install
   ```
5. In the sneiper folder, create a ".env" file with the following settings. [An example file is include here.](https://github.com/fudgebucket27/sneiper/blob/main/.env.example)
   ```text
   RECOVERY_PHRASE=your recovery phrase, use a burner
   RPC_URL= the SEI rpc url
   MINT_URL=eg https://www.seitarded.xyz //the url of the lighthouse mint site
   MODE=set to BUY to snipe on pallet. set to MINT to snipe lighthouse mints.
   MINT_LIMIT_PER_PHASE=eg 2 /the amount of NFTs to mint per phase
   MINT_LIMIT_TOTAL=eg 4 /the total amount of NFTs to mint overall across all phases
   CONTRACT_ADDRESS=the contract address for the collection
   TOKEN_ID=the token id for the NFT, you can add multiple token ids, just seperate them with a comma, or use SWEEP to search the first 25 NFTs in the collection that fall under the PRICE_LIMIT. or use AUTO to keep buying 1 NFT at a time under the PRICE_LIMIT until the BUY_LIMIT is reached. 
   BUY_LIMIT=if using SWEEP in TOKEN_ID, this is the amount of NFTs to buy in a sweep in one transaction; limited to 25 max. if using AUTO this is the max amount of NFTs to buy in total.
   PRICE_LIMIT=eg 30 //the price limit to buy at for the NFT
   GAS_LIMIT=eg 0.1 //the gas limit
   POLLING_FREQUENCY= in seconds, how often to check pallet for listings
   ```
   
6. To run sneiper, in terminal run:
   ```bash
   npm start run
   ```
   
# Contributing
Pull requests are welcome! 

# TO DO
1. Support for dagora
2. Lighthouse mint sniper
