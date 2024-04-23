import IERC20ABI                          from "./library/abi/IERC20.js";
import IUniswapV2Pair                     from "./library/abi/IUniswapV2Pair.js";
import IUniswapV2Factory                  from "./library/abi/IUniswapV2Factory.js";
import ITeamFinanceLock                   from "./library/abi/ITeamFinance.js";
import IUnicrypt                          from "./library/abi/IUnicrypt.js";
import IPinkLock                          from "./library/abi/IPinkLock.js";
import { logSuccess }                     from "./library/logging.js";
import { match, getBigNumberFromString }  from "./library/utils.js";
import { getUniv2PairAddress }            from "./library/univ2.js";
import {
  wssProvider   ,
  IERC20        ,
  uniswapV2Pair ,
  CONTRACTS     ,
  TOKENS        ,
}                                         from "./library/constants.js";

import newTokenStructure                  from "./models/newTokens.js";
import sniperTxsStructure                 from "./models/sniperTxs.js";

import { io }                             from "./connection/socketIO.js";

import { createRequire }                  from "module";

const require     = createRequire(import.meta.url);
const abiDecoder  = require("abi-decoder");

abiDecoder.addABI(IERC20ABI);
abiDecoder.addABI(IUniswapV2Pair);
abiDecoder.addABI(IUniswapV2Factory);
abiDecoder.addABI(ITeamFinanceLock);
abiDecoder.addABI(IUnicrypt);
abiDecoder.addABI(IPinkLock);

// Handle detect ERC20 token creation
const detectForContractCreation = async (tx) => {
  
  const contractAddress = tx.contractAddress;

  // Get name, symbol, totalSupply, decimals of the contract. If these things are exist, this contract is token contract.
  let name, symbol, totalSupply, decimals;
  
  try {
    name        = await IERC20.attach(contractAddress).name();
    symbol      = await IERC20.attach(contractAddress).symbol();
    totalSupply = await IERC20.attach(contractAddress).totalSupply();
    decimals    = await IERC20.attach(contractAddress).decimals();
    
    // Check if the contract is NFT: NFT's decimal is ZERO
    if (decimals == 0) return;

    let owner;
    try {
      owner = await IERC20.owner();
    } catch (e) {
      try {
        owner = await IERC20.getOwner();
      } catch (e) {
        owner = tx.from;
      }
    }
    
    let contractSourceCode = "";

    const fetchURL = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=E4DKRHQZPF2RVBXC6G2IBP56PJFFBITYVA`;
    await fetch(fetchURL)
    .then((res)   => res.json())
    .then((json)  => {
      contractSourceCode = json.result[0].SourceCode;
    })
    .catch(()     => {
      console.log("Error when getting smart contract code from etherscan.");
    });

    console.log("We detect new ERC20 token creation", {
      address: contractAddress.toLowerCase(),
      name,
      symbol,
      decimals,
      owner,
      totalSupply,
      tokenCreationHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      hash: tx.transactionHash,
    });

    const newToken = await newTokenStructure.create({
      address: contractAddress.toLowerCase(),
      name,
      symbol,
      decimals,
      owner,
      totalSupply,
      tokenCreationHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      contractSourceCode,
    });

    io.emit("newContractCreated", newToken);
  } catch (e) {
    // This contract is not ERC20 token contract.
    return;
  }
};

// Analyze the log of the transaction. Mainly find swap methods.
const detectPairCreate = async (parameters) => {
  const { decodedLogs, txHash, blockNumber } = parameters;

  for (const decodedLog of decodedLogs) {
    if (
      decodedLog.name == "PairCreated" &&
      match(decodedLog.address, CONTRACTS.UNIV2_FACTORY)
    ) {
      const token0  = decodedLog.events[0].value;
      const token1  = decodedLog.events[1].value;
      const pair    = decodedLog.events[2].value;

      // We detect only WETH pair now
      if (!match(token0, TOKENS.WETH) && !match(token1, TOKENS.WETH)) continue;

      const tokenAddress = match(token0, TOKENS.WETH)
        ? token1.toLowerCase()
        : token0.toLowerCase();

      const tokenCheck = await newTokenStructure.findOne({
        address: tokenAddress,
      });

      if(tokenCheck == null) continue;

      console.log("We detect WETH pair create.", {
        address:    tokenAddress,
        pair:       pair.toLowerCase(),
        pairToken:  TOKENS.WETH,
        PairBlock:  blockNumber,
        hash:       txHash,
      });

      let updateToken = await newTokenStructure.findOneAndUpdate(
        {
          address: tokenAddress,
        },
        {
          pair: pair.toLowerCase(),
          pairToken: TOKENS.WETH,
          PairBlock: blockNumber,
        },
        {}
      );

      io.emit("newPairCreated", updateToken);
    }
  }
};

// Analyze the log of the transaction. Mainly find swap methods.
const detectSwapLogs = async (parameters) => {
  const { decodedLogs, txHash, blockNumber } = parameters;

  for (const decodedLog of decodedLogs) {
    if (decodedLog.name == "Swap") {
      
      const pair = decodedLog.address.toLowerCase();
      
      let token0, token1;
      try {
        // If the pair is uniswap v2 pair
        token0 = await uniswapV2Pair.attach(pair).token0();
        token1 = await uniswapV2Pair.attach(pair).token1();
        if (
          pair !==
          getUniv2PairAddress({ tokenA: token0, tokenB: token1 }).toLowerCase()
        )
          continue;
      } catch (e) {
        continue;
      }

      const tokenCheck = await newTokenStructure.findOne({ pair });
     
      if (tokenCheck == null) continue;

      // const sender = decodedLog.events[0].value;
      const amount0In   = decodedLog.events[1].value;
      const amount1In   = decodedLog.events[2].value;
      const amount0Out  = decodedLog.events[3].value;
      const amount1Out  = decodedLog.events[4].value;
      // const to = decodedLog.events[5].value;

      let swapDirection; // 0: WETH -> TOKEN(BUY), 1: TOKEN -> WETH(SELL)
      if (amount1Out == "0") {
        swapDirection = match(token0, TOKENS.WETH) ? 1 : 0;
      } else {
        swapDirection = match(token0, TOKENS.WETH) ? 0 : 1;
      }

      let tradeTokenAmount; // Trade amount of token
      if (swapDirection == 0) {
        tradeTokenAmount = amount0Out != "0" ? amount0Out : amount1Out;
      } else {
        tradeTokenAmount = amount0In != "0" ? amount0In : amount1In;
      }

      if (tokenCheck.buyCount == undefined) {
        tokenCheck.buyCount             = swapDirection == 0 ? 1 : 0;
        tokenCheck.sellCount            = swapDirection == 1 ? 1 : 0;
        tokenCheck.firstBlockBuyCount   = swapDirection == 0 ? 1 : 0;
        tokenCheck.firstBlockSellCount  = swapDirection == 1 ? 1 : 0;
        tokenCheck.maxTradeTokenAmount  = tradeTokenAmount;
        tokenCheck.firstSwapBlockNumber = blockNumber;
        
        await tokenCheck.save();

        await sniperTxsStructure.create({
          address: (match(token0, TOKENS.WETH) ? token1 : token0).toLowerCase(),
          txHash
        })

        io.emit("swapEnabled", tokenCheck);
      } else {
        tokenCheck.buyCount             = swapDirection == 0 
                                            ? tokenCheck.buyCount + 1  
                                            : tokenCheck.buyCount;

        tokenCheck.sellCount            = swapDirection == 1 
                                            ? tokenCheck.sellCount + 1 
                                            : tokenCheck.sellCount;

        tokenCheck.maxTradeTokenAmount  = getBigNumberFromString(tokenCheck.maxTradeTokenAmount).lt(getBigNumberFromString(tradeTokenAmount))
                                            ? tradeTokenAmount
                                            : tokenCheck.maxTradeTokenAmount;

        if (blockNumber === tokenCheck.firstSwapBlockNumber) {
          tokenCheck.firstBlockBuyCount   = tokenCheck.buyCount;
          tokenCheck.firstBlockSellCount  = tokenCheck.sellCount;
  
          await sniperTxsStructure.create({
            address: (match(token0, TOKENS.WETH) ? token1 : token0).toLowerCase(),
            txHash
          })
          
          io.emit("sniperAttack", tokenCheck);
          console.log("sniperAttack", txHash)
        }

        await tokenCheck.save();
      }
      return;

    }
  }
}

const analyze = async (block) => {
  const txs = block.transactions;
  for (const txReceipt of txs) {
    const tx = await wssProvider.getTransactionReceipt(txReceipt.hash);
    try {
      // Ignore failed transaction
      if (tx.status == 0) continue;

      // Detect for contract creation
      if (tx.to == null && tx.contractAddress != null) {
        // Analyze new contract is created
       await detectForContractCreation(tx);
      }

      let decodedLogs = [];
      try {
        decodedLogs = abiDecoder.decodeLogs(tx.logs);
      } catch (e) {
        continue;
      }
      // Analyze the logs for Pair create
      await detectPairCreate({
        decodedLogs,
        txHash      : tx.transactionHash,
        blockNumber : tx.blockNumber
      });

      // Analyze the logs for swap
      await detectSwapLogs({
        decodedLogs,
        txHash      : tx.transactionHash,
        blockNumber : tx.blockNumber
      });
    } catch (e) {
    //  console.log("Error:", {tx}, e);
    }
  }
};

export const start = async () => {  
  
  let isDoneSyncing       = false;
  const lastBlockNumber   = await wssProvider.getBlockNumber();
  
  let lastestBlockNumber  = lastBlockNumber - 3600 * 2;
  let curBlockNamber      = 19718805;

  for(let blockNumber = curBlockNamber; ; ++ blockNumber) {
    if(blockNumber > await wssProvider.getBlockNumber()) break;
    await analyze(await wssProvider.getBlockWithTransactions(blockNumber));
  }

  logSuccess("Sync is done.");
  isDoneSyncing     = true;
  let prevoiusBlock = 0;

  wssProvider.on("block", async (currentBlock) => {

    if (prevoiusBlock >= currentBlock) return;
    if (!isDoneSyncing) return;
    
    prevoiusBlock = currentBlock;
    
    try {
      const block = await wssProvider.getBlockWithTransactions(currentBlock);
      analyze(block); 
    } catch (e) {
      console.log("Error", e);
    }
  })
}