import mongoose from "mongoose";

export const connectDB = async () => {
  // Throws on failure — let the caller (startServer) handle exit
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MONGODB CONNECTED SUCCESSFULLY!");
};
