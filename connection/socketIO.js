import express                    from "express";
import morgan                     from "morgan";
import cors                       from "cors";
import { Server }                 from "socket.io";
import { contractInfoRouter }     from "./routes/contractInfo.js";
import newTokenStructure          from "../models/newTokens.js";

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 11111;

var httpServer = app.listen(port, (error) => {
  if (error) {
    console.log("Error ocurred: " + error);
    return;
  }
  console.log(`Express Server running on Port: ${port}`);
});

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", async (socket) => {
  console.log("client connected: ", socket.id);

  const tokens  = await getContracts();

  io.to(socket.id).emit("clientConnected", {
    contracts: tokens,
    time: new Date()
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket Disconnect: ${reason}`);
  });
});

app.use("/api/v1/contractInfo", contractInfoRouter);

export const getContracts = async () => {
  const tokens  = [];
  let contracts = await newTokenStructure.find().sort({createdAt: -1}).limit(300);
  
  for (const contract of contracts) {
    if (contract.pair == undefined) continue;
    let tokenInfo = {
      address                 :   contract.address,
      name                    :   contract.name,
      symbol                  :   contract.symbol,
      level                   :   contract.level,
      pair                    :   contract.pair,
      createdAt               :   contract.createdAt,
      updatedAt               :   contract.updatedAt,
      owner                   :   contract.owner,
      blockNumber             :   contract.blockNumber,
      nonceCount              :   contract.nonceCount,
    };
    
    if (contract.buyCount == undefined) {
      tokens.push(tokenInfo)
      continue;
    }
    tokenInfo = {
      ...tokenInfo            ,
      buyCount                :   contract.buyCount,
      sellCount               :   contract.sellCount,
      firstBlockBuyCount      :   contract.firstBlockBuyCount,
      firstBlockSellCount     :   contract.firstBlockSellCount,
      maxTradeTokenAmount     :   contract.maxTradeTokenAmount,
      firstSwapBlockNumber    :   contract.firstSwapBlockNumber,
    }
    tokens.push(tokenInfo)
  }
  return tokens;
}
