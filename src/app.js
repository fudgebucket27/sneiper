import express from 'express';
import bodyParser from 'body-parser';
import open from 'open';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import {main} from './index.js';
import { logBuffer } from './helpers.js';


const app = express();

// To handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');

// Function to read and parse the .env file
const getCurrentConfig = () => {
  try {
    const envPath = join(process.cwd(), '.env');

    const envFileContent = fs.readFileSync(envPath, { encoding: 'utf-8' });
    const config = dotenv.parse(envFileContent); // Parses the .env content into an object
    return config;
  } catch (error) {
    console.error('Error reading the .env file:', error);
    return {};
  }
};

//Save config to .env file
const saveConfigToEnv = (config) => {
  const envPath = join(process.cwd(), '.env');
  let envContent = '';

  // Convert config object to .env format
  for (const [key, value] of Object.entries(config)) {
    envContent += `${key}=${value}\n`;
  }

  // Write to .env file
  fs.writeFileSync(envPath, envContent, { encoding: 'utf-8' });
};

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  const currentConfig = getCurrentConfig();
  res.render('index', { currentConfig });
});

app.post('/start', (req, res) => {
  // Extract form data
  const { recoveryPhrase, rpcUrl, gasLimit, mode,
    mintUrl, mintLimitPerPhase, mintLimitPerWallet,mintLimitTotal,
    contractAddress,tokenId,priceLimit,pollingFrequency, buyLimit } = req.body;
  const config = {
    RECOVERY_PHRASE: recoveryPhrase,
    RPC_URL: rpcUrl,
    GAS_LIMIT: gasLimit,
    MODE: mode,
    MINT_URL: mintUrl,
    MINT_LIMIT_PER_PHASE: mintLimitPerPhase,
    MINT_LIMIT_PER_WALLET: mintLimitPerWallet,
    MINT_LIMIT_TOTAL: mintLimitTotal,
    CONTRACT_ADDRESS: contractAddress,
    TOKEN_ID: tokenId,
    PRICE_LIMIT: priceLimit,
    POLLING_FREQUENCY: pollingFrequency,
    BUY_LIMIT: buyLimit
  };

  // Save configuration to .env
  saveConfigToEnv(config);

  // Start the main loop based on the mode
  if(mode === 'MINT' || mode === 'BUY') {
    console.log('Starting in mode:', mode);
    main();
  }

  res.redirect('/logs');
});

app.get('/logs', (req, res) => {
  res.json(logBuffer);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sneiper is running on --> http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});
