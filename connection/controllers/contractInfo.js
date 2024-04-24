import newTokenStructure              from "../../models/newTokens.js";
import sniperTxsStructure             from "../../models/sniperTxs.js";
import ethers                         from "ethers";
import { wssProvider, SNIPERS }       from "../../library/constants.js";

export const getSniperModel = async (sniperTxsDB) => {

  let sniperTxs     = [],
      BGCount       = 0, 
      MaestroCount  = 0;

  for (const sniperTxDB of sniperTxsDB) {
    const sniperTx = await wssProvider.getTransaction(sniperTxDB.txHash);
    
    if(sniperTx === null || sniperTx.to === null) continue;
    
    let toAddress = "";

    switch(sniperTx.to.toLocaleLowerCase()) {
      case SNIPERS.BANANA_GUN:
        toAddress = "BananaGun"
        BGCount ++
      break;

      case SNIPERS.UNIV2_ROUTER:
        toAddress = "UniswapV2Router"
      break;

      case SNIPERS.MAESTRO:
        toAddress = "Maestro"
        MaestroCount ++
      break;

      default:
        toAddress = sniperTx.to
    }

    sniperTxs.push({
      txHash        :     sniperTx.hash,
      from          :     sniperTx.from,
      to            :     toAddress,
      nonce         :     sniperTx.nonce,
      priorityFee   :     ethers.utils.formatUnits(sniperTx.maxPriorityFeePerGas !== undefined ? sniperTx.maxPriorityFeePerGas : ethers.constants.Zero, "gwei"),
      gasLimit      :     sniperTx.gasLimit.toString(),
      value         :     ethers.utils.formatEther(sniperTx.value)
    });
  }

  return { sniperTxs, BGCount, MaestroCount };
}

export const getContractInfo = async (req, res) => {    
  try {
    console.log(req.query)
    const address   = req.query.address.toLowerCase();
    const tokenInfo = await newTokenStructure.findOne({ address: address });

    if (tokenInfo == null) {
      res.status(400).json({
        success : false,
        error   : "Nothing matched"
      })
      return
    }

    let contractCode = "";
    
    const fetchURL = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${tokenInfo.address}&apikey=E4DKRHQZPF2RVBXC6G2IBP56PJFFBITYVA`;
    await fetch(fetchURL)
    .then((res)   => res.json())
    .then((json)  => {
      contractCode = json.result[0].SourceCode;
    })
    .catch(()     => {
      console.log("Error when getting smart contract code from etherscan.");
    });

    let sniperTxsDB = await sniperTxsStructure.find({address: address}, {txHash: 1}); 
    
    if (tokenInfo != null) {
      res.status(200).json({
        success             :     true,
        data                :     tokenInfo,
        sniperTxs           :     await getSniperModel(sniperTxsDB)
      });
    } else {
      res.status(400).json({
        success             :     false,
        error               :     "There's no such contract.",
      });
    }
  } catch (e) {
    res.status(400).json({
      success : false,
      error   : e.message,
    });
  }
};

export const getContractInfoByPair = async (req, res) => {
  const query = req.query;
  try {
    const pairAddress = query.address.toLowerCase();
    const tokenInfo   = await newTokenStructure.findOne({
      pair: pairAddress,
    });

    if (tokenInfo != null) {
      res.status(200).json({
        success : true,
        data    : tokenInfo,
      });
    } else {
      res.status(200).json({
        success : false,
        error   : "There's no such contract.",
      });
    }
  } catch (e) {
    res.status(200).json({
      success : false,
      error   : e.message,
    });
  }
};

export const setContractLevel = async (req, res) => {
  try {
    const { address, level }  = req.body;
    const tokenInfo           = await newTokenStructure.findOne({ address });

    tokenInfo.level           = level;
    
    await tokenInfo.save();
    
    res.status(200).json({
      success : true,
    });
  } catch (e) {
    res.status(400).json({
      success : false,
      error   : e.message,
    });
  }
};

export const deleteOldTokens = async (req, res) => {
  try {
    const currentBlockNumber  = await wssProvider.getBlockNumber();

    const deleteResult        = await newTokenStructure.deleteMany({
      blockNumber: { $lt: currentBlockNumber - 3600 * 72 / 12 },
    });

    res.status(200).json({
      success       : true,
      deletectCount : deleteResult.deletedCount,
    });
  } catch (e) {

    res.status(400).json({
      success       : false,
      error         : e.message,
    });
  }
};