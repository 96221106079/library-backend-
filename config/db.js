import mongoose from "mongoose";

const configureDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is missing");
    }

    const db = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`Connected to MongoDB: ${db.connection.host}`);
    return db;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }
};

export default configureDB;
