import mongoose from "mongoose";
import { mongodb_database } from "../constants.js";

const dbConnect = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      process.env.MONGODB_URI + mongodb_database
    );
    console.log(
      "\n connected to db,connection host: ",
      connectionInstance.connection.host
    );
  } catch (error) {
    console.error("failed to connect mongodb Atlas", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

export default dbConnect;
