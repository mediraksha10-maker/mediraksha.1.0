import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String, // "09:00 - 09:15"
    required: true,
  },
  status: {
    type: String,
    default: "available",
  },
});

export default mongoose.model("Slot", slotSchema);
