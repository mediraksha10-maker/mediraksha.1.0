import mongoose from "mongoose";
import Slot from "../models/Slot.js";

// POST /api/slots/create
export const createSlots = async (req, res) => {
  try {
    const authDoctorId = req.user;
    const { doctorId, date, times } = req.body;

    if (!mongoose.isValidObjectId(authDoctorId)) {
      return res.status(401).json({ message: "Invalid session", msg: "Invalid session" });
    }

    if (!doctorId || String(doctorId) !== String(authDoctorId)) {
      return res.status(403).json({
        message: "You can only create slots for your own account",
        msg: "You can only create slots for your own account",
      });
    }

    if (!date || typeof date !== "string") {
      return res.status(400).json({ message: "date is required", msg: "date is required" });
    }

    if (!Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ message: "times is required", msg: "times is required" });
    }

    const normalizedTimes = [...new Set(
      times
        .filter((time) => typeof time === "string")
        .map((time) => time.trim())
        .filter(Boolean)
    )];

    if (normalizedTimes.length === 0) {
      return res.status(400).json({ message: "No valid time slots provided", msg: "No valid time slots provided" });
    }

    const docs = normalizedTimes.map((time) => ({
      doctorId: authDoctorId,
      date: date.trim(),
      time,
    }));

    const createdSlots = await Slot.insertMany(docs);

    return res.status(201).json({
      message: "Slots published successfully",
      msg: "Slots published successfully",
      slots: createdSlots,
    });
  } catch (error) {
    console.error("createSlots error:", error);
    return res.status(500).json({ message: "Server error", msg: "Server error" });
  }
};

// GET /api/slots/doctors
export const getDoctorsWithSlots = async (_req, res) => {
  try {
    const doctors = await Slot.aggregate([
      { $match: { status: "available" } },
      { $sort: { date: 1, time: 1 } },
      {
        $group: {
          _id: "$doctorId",
          availability: { $push: { $concat: ["$date", " | ", "$time"] } },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "_id",
          as: "doctor",
        },
      },
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$doctor.name", "Unknown Doctor"] },
          hospital: { $ifNull: ["$doctor.hospital", "Unknown Hospital"] },
          specialization: { $ifNull: ["$doctor.specialization", "General"] },
          availability: 1,
        },
      },
    ]);

    return res.status(200).json(doctors);
  } catch (error) {
    console.error("getDoctorsWithSlots error:", error);
    return res.status(500).json({ message: "Server error", msg: "Server error" });
  }
};

// GET /api/slots/my
export const getMySlotsByDoctor = async (req, res) => {
  try {
    const doctorId = req.user;
    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(401).json({ message: "Invalid session", msg: "Invalid session" });
    }

    const doctors = await Slot.aggregate([
      { $match: { status: "available", doctorId: new mongoose.Types.ObjectId(doctorId) } },
      { $sort: { date: 1, time: 1 } },
      {
        $group: {
          _id: "$doctorId",
          availability: { $push: { $concat: ["$date", " | ", "$time"] } },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "_id",
          as: "doctor",
        },
      },
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$doctor.name", "Unknown Doctor"] },
          hospital: { $ifNull: ["$doctor.hospital", "Unknown Hospital"] },
          specialization: { $ifNull: ["$doctor.specialization", "General"] },
          availability: 1,
        },
      },
    ]);

    return res.status(200).json(doctors);
  } catch (error) {
    console.error("getMySlotsByDoctor error:", error);
    return res.status(500).json({ message: "Server error", msg: "Server error" });
  }
};
