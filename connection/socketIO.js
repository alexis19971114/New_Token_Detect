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

  let contracts = await newTokenStructure.find().sort({createdAt: -1});
  const tokens  = [];

  for (const contract of contracts) {
    if (contract.pair == undefined) continue;
    let tokenInfo = {
      address                 :   contract.address,
      name                    :   contract.name,
      symbol                  :   contract.symbol,
      level                   :   contract.level,
      pair                    :   contract.pair,
      created_at              :   contract.createdAt,
      updated_at              :   contract.updatedAt,
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

  io.emit("clientConnected", {
    contracts: tokens
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket Disconnect: ${reason}`);
  });
});

app.use("/api/v1/contractInfo", contractInfoRouter);

