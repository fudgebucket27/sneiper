# sneiper
Snipe NFTs on SEI. Works with Pallet.

# Features
1. Target a Collection and an NFT to buy it under a certain price point
2. Target a Collection and buy multiple NFTs that fall under a certain price point

# Setup
1. Install node js, npm and git
2. Clone this repo, in terminal run: git clone https://github.com/fudgebucket27/sneiper
3. In terminal run: cd sneiper
2. In terminal run: npm install
3. In root of the repo's folder create a .env file with the following variables

   RECOVERY_PHRASE=your recovery phrase 
   
   RPC_URL= the rpc url
   
   CONTRACT_ADDRESS=the contract address for the collection
   
   TOKEN_ID=the token id for the NFT, or use ALL to search the first 25 NFTs in the collection that fall under the PRICE_LIMIT

   BUY_LIMIT=if using ALL in TOKEN_ID, this is the amount of NFTs to buy at a time. Limited to 25 max.
   
   PRICE_LIMIT=eg 30 //the price limit to buy at for the NFT
   
   GAS_LIMIT=eg 0.1 //the gas limit
   
   POLLING_FREQUENCY= in seconds, how often to check pallet for listings
   
5. To run sneiper, in terminal run: npm start run
