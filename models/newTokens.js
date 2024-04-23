import mongoose from "mongoose";

const newTokensSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    decimals: {
      type: Number,
      required: true,
    },
    owner: {
      type: String,
      require: true,
    },
    totalSupply: {
      type: String,
    },
    tokenCreationHash: {
      type: String,
    },
    blockNumber: {
      type: Number,
    },
    pair: {
      type: String,
    },
    pairToken: {
      type: String,
    },
    pairBlock: {
      type: Number,
    },
    buyCount: {
      type: Number,
    },
    sellCount: {
      type: Number,
    },
    contractSourceCode: {
      type: String,
      default: "",
    },
    maxTradeTokenAmount: {
      type: String,
    },
    level: {
      type: Number,
      default: 0,
    },
    firstSwapBlockNumber: {
      type: Number,
    },
    firstBlockBuyCount: {
      type: Number,
    },
    firstBlockSellCount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("newTokenStructure", newTokensSchema);
