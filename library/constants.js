import dotenv             from "dotenv";
import { ethers }         from "ethers";
import IERC20ABI          from "./abi/IERC20.js";
import IUniswapV2PairAbi  from "./abi/IUniswapV2Pair.js";

dotenv.config();

export const CONTRACTS = {
  UNIV2_ROUTER:   "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  UNIV32_ROUTER:  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
  UNIV2_FACTORY:  "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
  DEAD:           "0x0000000000000000000000000000000000000000",
  DEAD2:          "0x000000000000000000000000000000000000dead"
};

export const SNIPERS = {
  BANANA_GUN: "0x3328F7f4A1D1C57c35df56bBf0c9dCAFCA309C49".toLocaleLowerCase(),
  UNIV2_ROUTER: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d".toLocaleLowerCase(),
  MAESTRO: "0x80a64c6D7f12C47B7c66c5B4E20E72bc1FCd5d9e".toLocaleLowerCase()
}

export const TOKENS = {
  WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
};

export const httpProvider = new ethers.providers.JsonRpcProvider(
  process.env.RPC_URL
);

export const wssProvider = new ethers.providers.WebSocketProvider(
  process.env.RPC_URL_WSS
);

export const uniswapV2Pair = new ethers.Contract(
  ethers.constants.AddressZero,
  IUniswapV2PairAbi,
  wssProvider
);

export const IERC20 = new ethers.Contract(
  ethers.constants.AddressZero,
  IERC20ABI,
  wssProvider
)