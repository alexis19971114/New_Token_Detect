import { ethers } from "ethers";
import { uniswapV2Pair } from "./constants.js";
import { match } from "./utils.js";

/*
  Sorts tokens
*/
export const sortTokens = (tokenA, tokenB) => {
  if (ethers.BigNumber.from(tokenA).lt(ethers.BigNumber.from(tokenB))) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
};

/*
  Computes pair addresses off-chain
*/
export const getUniv2PairAddress = (parameters) => {
  const { tokenA, tokenB } = parameters;
  const [token0, token1] = sortTokens(tokenA, tokenB);

  const salt = ethers.utils.keccak256(token0 + token1.replace("0x", ""));
  const address = ethers.utils.getCreate2Address(
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Factory address (contract creator)
    salt,
    "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
  );

  return address;
};

/*
  Get reserve helper function
*/
export const getUniv2Reserve = async (parameters) => {
  const {pair, tokenA, tokenB} = parameters;
  let reserve0, reserve1;
  try{
    [reserve0, reserve1] = await uniswapV2Pair.attach(pair).getReserves();
  } catch(e) { 
    [reserve0, reserve1] = [0, 0];
  }
  
  const [token0] = sortTokens(tokenA, tokenB);
  if (match(tokenA, token0)) {
    return [reserve0, reserve1];
  }
  return [reserve1, reserve0];
};
