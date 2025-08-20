import dotenv from "dotenv";
import dbConnect from "./db/index.js";
import app from "./app.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await dbConnect();
    app.listen(PORT, () => {
      console.log("server is listening on port: ", PORT);
    });
  } catch (error) {
    console.error("Failed to connect to mongodb", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();
