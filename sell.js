const opensea = require("opensea-js");
const { WyvernSchemaName } = require('opensea-js/lib/types');
const OpenSeaPort = opensea.OpenSeaPort;
const Network = opensea.Network;
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");

// require('dotenv').config();

const MNEMONIC = "sport erode immense cause mouse student country license soup evolve luggage edge"//process.env.MNEMONIC;
const INFURA_KEY = "44dbc7380dda4186929d9e9a594c6e34"//process.env.INFURA_KEY;
const OWNER_ADDRESS = "0x1e92aee97000f50b54D280919b4DF8A35b5d6e21"//process.env.OWNER_ADDRESS;
const NFT_CONTRACT_ADDRESS = "0x0f8337e23af27447072e2ed31fb32de43db34326"//process.env.NFT_CONTRACT_ADDRESS; 
const NETWORK = "rinkeby"//process.env.NETWORK;
const API_KEY = "ec3d4ec8f40f45b8b14623bd5ab20522"//process.env.API_KEY;

const PROJECT_NAME = "cyber-ape-v2";
const LIST_TIMEOUT = 86400; //#24h-> sec

console.log("=============================================================");
console.log(`MNEMONIC = ${MNEMONIC}`);
console.log(`NODE_API_KEY = ${INFURA_KEY}`);
console.log(`NFT_CONTRACT_ADDRESS = ${NFT_CONTRACT_ADDRESS}`);
console.log(`OWNER_ADDRESS = ${OWNER_ADDRESS}`);
console.log(`NETWORK = ${NETWORK}`);
console.log(`API_KEY = ${API_KEY}`);
console.log("=============================================================");

// setting
var current_index = 0;
var err_retrycount = 0;
var tokens = [];
var cyclelist = true;

const RETRY_COUNT = 2;
const listforever = false;
const listTime = 1440; //m
const price = 0.012;   //ETH
const intervalTime = 12000; //18000; //ms
const listing_time = 0; 

function logs(arg) {
  console.log("opensea log:", arg);
};

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
};


const provider = new HDWalletProvider({
  mnemonic: {
    phrase: MNEMONIC
  },
  providerOrUrl: "https://rinkeby.infura.io/v3/" + INFURA_KEY
});

const seaport = new OpenSeaPort(provider, {
  networkName: Network.Rinkeby
},logs
);


function isFileExisted(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return true;
    }
    return false
  } catch (e) {
    console.log(e)
    return false
  }
}

function readLines(filepath) {
  var lines = []
  var allFileContents = fs.readFileSync(filepath, 'utf-8');
  allFileContents.split(/\r?\n/).forEach(line => {
    if (line == "") {
      return;
    }
    lines.push(line);
    // console.log(`Line from file: ${line}`);
  });
  return lines;
}


//list index
function recordListIndex(list_index) {
  try {
    fs.writeFileSync(PROJECT_NAME + '_last_request.id', list_index.toString())
  } catch (e) { console.log(e) }
}

function loadListIndex() {
  if (isFileExisted(PROJECT_NAME + '_last_request.id')) {
    var cachedContext = fs.readFileSync(PROJECT_NAME + '_last_request.id', 'utf-8');
    try {
      if (cachedContext != undefined)
        current_index = parseInt(cachedContext)
    }
    catch (e) {
      console.log("existsSync", e)
    }
  }
}


//time
function record_list_time(token) {
  if (token==""){
    return;
  }
  sec = Math.floor(Date.now() / 1000);
  date = new Date(Date.now());
  datestr = date.getFullYear() + "-" + date.getMonth() + 1 + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
  str = token + "#" + sec + "#" + datestr;
  filepath = PROJECT_NAME + "-record-list-token.json";
  if (isFileExisted(filepath) == false) {
    fs.writeFileSync(filepath, "");
  }
  lines = readLines(filepath);
  ischange = false;
  for (let index = 0; index < lines.length; index++) {
    arr = lines[index].replace('\n', '').replace('\r', '').split("#")
    if (arr.length >= 1 && token == arr[0]) {
      lines[index] = str;
      ischange = true;
      break
    }
  }
  if (!ischange) {
    lines.push(str);
  }
  fs.truncateSync(filepath, -1)
  lines.forEach(line => {
    fs.appendFileSync(filepath, line + "\n")
  })
}

function check_list_time(token) {
  if (token == ""){
    return true;
  }
  filepath = PROJECT_NAME + "-record-list-token.json";
  if (isFileExisted(filepath) == false) {
    fs.writeFileSync(filepath, "");
  }
  record_time = 0;
  lines = readLines(filepath);
  for (let index = 0; index < lines.length; index++) {
    arr = lines[index].replace('\n', '').replace('\r', '').split("#");
    if (arr.length >= 1 && token == arr[0]) {
      record_time = parseInt(arr[1])
      break
    }
  }
  sec = Math.floor(Date.now() / 1000);
  offset = sec - record_time;
  if (offset > LIST_TIMEOUT) {
    return true;
  }
  console.log(`check list time fail token: ${token}, left time: ${LIST_TIMEOUT-offset}`);
  return false;
}


///start
async function main() {
  var current_time = Date.now()/1000;
  var expirationTime = Math.round(current_time + 60 * listTime);
  var listingTime = undefined;
  if (listing_time > 0) listingTime = Math.round(current_time + 60 * listing_time);
  if (current_index >= tokens.length) {
      current_index = 0;
  }

  try {
    var tokenId = tokens[current_index].toString();

    if (listforever) expirationTime = 0;

    if (!check_list_time(tokenId)) {
      await wait(10000)
      current_index += 1;
      main();
      return;
    }
    console.log(`Start list: expirationTime: ${expirationTime}, current_index: ${current_index}, tokenId: ${tokenId}, current_time: ${current_time}`)
    var queryAssets = new Array(1);
    queryAssets[0] = {
      tokenId: tokenId,
      tokenAddress: NFT_CONTRACT_ADDRESS,
      schemaName: WyvernSchemaName.ERC721
    };

    const fixedPriceSellOrder = await seaport.createSellOrder({
      asset: {
        tokenId:tokenId,
        tokenAddress:NFT_CONTRACT_ADDRESS,
        schemaName: WyvernSchemaName.ERC721
      },
      startAmount: price,
      expirationTime: expirationTime,
      accountAddress: OWNER_ADDRESS,
      listingTime: listingTime,
    });

    console.log(`Successfully created a order! ${fixedPriceSellOrder.asset.openseaLink}, current_index: ${current_index}, tokenId: ${tokenId}, cost sec = ${(Date.now()/1000 - current_time)}\n` );
    if (current_index >= tokens.length) {
        current_index = 0;
    } else {
        current_index += 1;
    }
    recordListIndex(current_index);
    record_list_time(tokenId)
    err_retrycount = 0;
    if (intervalTime > 0) {
      await wait(intervalTime)
    }

  } catch (e) {
    console.log(`logerr: ${e}, err_retrycount: ${err_retrycount}, current_index: ${current_index}`);
    err_retrycount += 1;
    if (err_retrycount > RETRY_COUNT) {
      if (current_index >= tokens.length) {
        current_index = 0;
      } else {
        current_index += 1;
      }
      err_retrycount = 0;
      await wait(15000);
    }
  }

  if (!cyclelist && current_index == 0)
    process.exit();

  main();
}

async function start() {
  loadListIndex();
  tokens = readLines(PROJECT_NAME + '-tokens.json')
  await wait(5000);
  main();
}

start();