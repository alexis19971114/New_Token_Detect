import mongoose from "mongoose";

const sniperTxsSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
    },
    txHash: {
      type: String,
      require: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("sniperTxsStructure", sniperTxsSchema);
