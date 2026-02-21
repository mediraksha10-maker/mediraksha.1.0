import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: false,
    },
    age: {
      type: Number,
      required: false,
    },
    registeredDoctor : {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor",
      default: null,
    }
  },
  { timestamps: true }
);

const User = mongoose.model("UserMR", schema);
export default User;