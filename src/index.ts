import express from "express";
import router from "./routes/index.js";
import dotenv from "dotenv";
import cors from "cors"
import { errorHandler } from "./common/errorhandler/errorHandler.js";
import { mongoDB } from "./common/DB/connect.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; 

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(router);

app.use(errorHandler);  

mongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Employee service running on port ${PORT}`);
  });
});