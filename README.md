# sneiper
THIS IS A WORK IN PROGRESS

Snipe NFTs on SEI. Works with Pallet so far.

## TO DO
1. Need to query Pallet api for listings
2. Need to query Pallet api for single listings
3. Option to buy at a threshold
4. How often to query pallet api
5. Buy now message should be configurable. It's currently hardcoded lmao.

# Setup
1. Clone this repo
2. In terminal run: npm install
3. In root of the repo's folder create a .env file with the following variables

   RECOVERY_PHRASE=your SEI wallet recovery phrase, i suggest using a burner

   RPC_URL=https://sei-rpc.polkachu.com/ //this is an example you probably want a high performing rpc url
5. To run sneiper, in terminal run: npm start run
