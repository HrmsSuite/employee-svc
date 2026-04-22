import { connectDB } from "@hrmssuite/persistence";
import dotenv from "dotenv";
dotenv.config();
export async function mongoDB() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }
    await connectDB(process.env.DATABASE_URL);
    console.log("DB is Connected");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}