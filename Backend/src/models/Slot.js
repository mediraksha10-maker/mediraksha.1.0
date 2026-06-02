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
    enum: ["available", "reserved", "booked"],
    default: "available",
  },
});

slotSchema.index({ doctorId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model("Slot", slotSchema);
