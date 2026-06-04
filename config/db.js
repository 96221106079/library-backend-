import mongoose from "mongoose";
const configureDB = async () => {
  try {
    const db = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/libraryDB"
    );
    console.log(`connected to MongoDb ${db.connection.host}`);
    return db;
  } catch (err) {
    console.error(`MongoDb Connection Failed : ${err.message}`);
    process.exit(1);
  }
};

export default configureDB;
