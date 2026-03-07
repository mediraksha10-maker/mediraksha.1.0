import mongoose from "mongoose";
import Slot from "../models/Slot.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import { cacheDel } from "../redis/cache.js";

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

// GET /api/slots/:doctorId/:date
export const getDoctorSlotsByDate = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId", msg: "Invalid doctorId" });
    }

    if (!date || typeof date !== "string") {
      return res.status(400).json({ message: "date is required", msg: "date is required" });
    }

    const slots = await Slot.find({ doctorId, date: date.trim(), status: "available" })
      .sort({ time: 1 })
      .lean();

    return res.status(200).json(slots);
  } catch (error) {
    console.error("getDoctorSlotsByDate error:", error);
    return res.status(500).json({ message: "Server error", msg: "Server error" });
  }
};

// POST /api/slots/book
export const bookSlotAppointment = async (req, res) => {
  try {
    const patientId = req.user;
    const { slotId, slotIds, patient } = req.body || {};

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(401).json({ message: "Invalid session", msg: "Invalid session" });
    }

    const selectedIdsRaw = Array.isArray(slotIds) ? slotIds : [slotId];
    const selectedIds = [...new Set(
      selectedIdsRaw
        .filter((id) => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    )];

    if (selectedIds.length === 0 || selectedIds.length > 2) {
      return res.status(400).json({
        message: "Select 1 or 2 slots",
        msg: "Select 1 or 2 slots",
      });
    }

    if (!selectedIds.every((id) => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "Invalid slotIds", msg: "Invalid slotIds" });
    }

    const slots = await Slot.find({ _id: { $in: selectedIds } });
    if (slots.length !== selectedIds.length) {
      return res.status(404).json({ message: "Some slots were not found", msg: "Some slots were not found" });
    }

    const doctorId = String(slots[0].doctorId);
    const allSameDoctor = slots.every((slot) => String(slot.doctorId) === doctorId);
    if (!allSameDoctor) {
      return res.status(400).json({
        message: "Selected slots must belong to same doctor",
        msg: "Selected slots must belong to same doctor",
      });
    }

    const unavailableSlot = slots.find((slot) => slot.status !== "available");
    if (unavailableSlot) {
      return res.status(409).json({ message: "One of the slots is not available", msg: "One of the slots is not available" });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found", msg: "Doctor not found" });
    }

    const notes = patient?.notes?.trim();
    const requestGroupId = new mongoose.Types.ObjectId().toString();

    const appointmentDocs = slots.map((slot) => ({
      patientId,
      doctorId: slot.doctorId,
      slotId: slot._id,
      requestGroupId,
      slotTime: slot.time,
      doctorName: doctor.name?.trim() || "Unknown Doctor",
      speciality: doctor.specialization?.trim() || "General Physician",
      hospitalName: doctor.hospital?.trim() || "Unknown Hospital",
      appointmentDate: new Date(`${slot.date}T00:00:00`),
      reasonOfAppointment: notes || "Booked from available slots",
      status: "pending",
    }));

    const appointments = await Appointment.insertMany(appointmentDocs);

    await Slot.updateMany({
      _id: { $in: selectedIds },
    }, {
      $set: { status: "reserved" },
    });

    await cacheDel(
      `cache:user:appointments:${patientId}`,
      `cache:doctor:appointments:${doctorId}`,
      `cache:doctor:patients:${doctorId}`
    );

    return res.status(201).json({
      message: "Slots sent to doctor for approval",
      appointment: {
        _id: appointments[0]?._id,
        bookingId: requestGroupId,
      },
    });
  } catch (error) {
    console.error("bookSlotAppointment error:", error);
    return res.status(500).json({ message: "Server error", msg: "Server error" });
  }
};
