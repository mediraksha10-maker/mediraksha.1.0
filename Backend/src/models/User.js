import mongoose from "mongoose";
import { AGE_MAX, AGE_MIN, ALLOWED_GENDERS } from "../utils/validation.js";

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
      enum: ALLOWED_GENDERS,
      trim: true,
    },
    age: {
      type: Number,
      required: false,
      min: AGE_MIN,
      max: AGE_MAX,
      validate: {
        validator: Number.isInteger,
        message: "Age must be a whole number",
      },
    },
    phoneNumber: {
      type: String,
      required: false,
      trim: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },
    registeredDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "doctor",
      },
    ],
  },
  { timestamps: true }
);


const User = mongoose.model("UserMR", schema);
export default User;
