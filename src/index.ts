import express from "express";
import router from "./routes/index.js";
import dotenv from "dotenv";
import cors from "cors";
import { errorHandler } from "./common/errorhandler/errorHandler.js";
import { mongoDB } from "./common/DB/connect.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:5173",
  "https://hrms-suite.netlify.app",
  "https://dev-hrms-suite.vercel.app/",
];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header (e.g. Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(router);

app.use(errorHandler);

mongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Employee service running on port ${PORT}`);
  });
});
