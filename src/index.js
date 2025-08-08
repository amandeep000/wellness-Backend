import dotenv from "dotenv";
dotenv.config();
import dbConnect from "./db/index.js";
import app from "./app.js";

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
