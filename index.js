import { start } from "./analyze.js";
import { connectDB } from "./database/db.js";

const main = async () => {
  const origLog = console.log;
  console.log = function (obj, ...placeholders) {
    if (typeof obj === "string")
      placeholders.unshift("[" + new Date().toISOString() + "] " + obj);
    else {
      placeholders.unshift(obj);
      placeholders.unshift("[" + new Date().toISOString() + "] %j");
    }
    origLog.apply(this, placeholders);
  };

  await connectDB();
  start();
};

main();
