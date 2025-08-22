import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const userIndexesToKeep = ["_id_", "email_1"]; // indexes you want to keep

async function dropObsoleteIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI + "ecommerce", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const userCollection = mongoose.connection.collection("users");
    const indexes = await userCollection.indexes();

    for (const index of indexes) {
      if (!userIndexesToKeep.includes(index.name)) {
        console.log(`Dropping index: ${index.name}`);
        await userCollection.dropIndex(index.name);
      }
    }

    console.log("Obsolete indexes removed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error dropping indexes:", err);
    process.exit(1);
  }
}

dropObsoleteIndexes();
