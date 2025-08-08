import mongoose from "mongoose";

const dbConnect = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(
      "\n connected to db,connection host: ",
      connectionInstance.connection.host
    );
  } catch (error) {
    console.error("failed to connect mongodbAtlas", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

export default dbConnect;
