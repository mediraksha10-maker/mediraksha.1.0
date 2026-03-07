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

    const normalizedDate = date.trim();
    const existingSlots = await Slot.find({
      doctorId: authDoctorId,
      date: normalizedDate,
      time: { $in: normalizedTimes },
    }).select("time").lean();

    const existingTimes = new Set(existingSlots.map((slot) => slot.time));
    const newTimes = normalizedTimes.filter((time) => !existingTimes.has(time));

    if (newTimes.length === 0) {
      return res.status(409).json({
        message: "Selected slots already exist for this date",
        msg: "Selected slots already exist for this date",
        createdCount: 0,
        skippedTimes: normalizedTimes,
      });
    }

    const docs = newTimes.map((time) => ({
      doctorId: authDoctorId,
      date: normalizedDate,
      time,
    }));

    const createdSlots = await Slot.insertMany(docs);

    return res.status(201).json({
      message:
        newTimes.length === normalizedTimes.length
          ? "Slots published successfully"
          : "Some slots already existed and were skipped",
      msg:
        newTimes.length === normalizedTimes.length
          ? "Slots published successfully"
          : "Some slots already existed and were skipped",
      createdCount: createdSlots.length,
      skippedTimes: normalizedTimes.filter((time) => existingTimes.has(time)),
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
          availability: { $addToSet: { $concat: ["$date", " | ", "$time"] } },
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
          availability: { $addToSet: { $concat: ["$date", " | ", "$time"] } },
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

    const rawSlots = await Slot.find({ doctorId, date: date.trim(), status: "available" })
      .sort({ time: 1 })
      .lean();

    const seenTimes = new Set();
    const slots = rawSlots.filter((slot) => {
      if (seenTimes.has(slot.time)) return false;
      seenTimes.add(slot.time);
      return true;
    });

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

    if (selectedIds.length !== 1) {
      return res.status(400).json({
        message: "Select exactly one slot",
        msg: "Select exactly one slot",
      });
    }

    if (!mongoose.isValidObjectId(selectedIds[0])) {
      return res.status(400).json({ message: "Invalid slotId", msg: "Invalid slotId" });
    }

    const slot = await Slot.findById(selectedIds[0]);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found", msg: "Slot not found" });
    }

    const doctorId = String(slot.doctorId);
    const appointmentDate = new Date(`${slot.date}T00:00:00`);
    const duplicateFilter = {
      patientId,
      doctorId: slot.doctorId,
      appointmentDate,
      status: { $ne: "cancelled" },
    };

    const existingAppointment = await Appointment.findOne(duplicateFilter)
      .select("slotTime")
      .lean();
    if (existingAppointment) {
      return res.status(409).json({
        message: `You already have an appointment with this doctor on this date${existingAppointment.slotTime ? ` at ${existingAppointment.slotTime}` : ""}`,
        msg: "You already have an appointment with this doctor on this date",
      });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found", msg: "Doctor not found" });
    }

    const bookedSlot = await Slot.findOneAndUpdate(
      { _id: slot._id, status: "available" },
      { $set: { status: "booked" } },
      { new: true }
    );
    if (!bookedSlot) {
      return res.status(409).json({ message: "This slot is not available", msg: "This slot is not available" });
    }

    const existingAfterLock = await Appointment.findOne(duplicateFilter)
      .select("_id")
      .lean();
    if (existingAfterLock) {
      await Slot.findByIdAndUpdate(bookedSlot._id, { $set: { status: "available" } });
      return res.status(409).json({
        message: "You already have an appointment with this doctor on this date",
        msg: "You already have an appointment with this doctor on this date",
      });
    }

    const notes = patient?.notes?.trim();
    const requestGroupId = new mongoose.Types.ObjectId().toString();
    const appointmentData = {
      patientId,
      doctorId: bookedSlot.doctorId,
      slotId: bookedSlot._id,
      requestGroupId,
      slotTime: bookedSlot.time,
      doctorName: doctor.name?.trim() || "Unknown Doctor",
      speciality: doctor.specialization?.trim() || "General Physician",
      hospitalName: doctor.hospital?.trim() || "Unknown Hospital",
      appointmentDate,
      reasonOfAppointment: notes || "Booked from available slots",
      status: "confirmed",
    };

    let appointment;
    try {
      appointment = await Appointment.create(appointmentData);
    } catch (createError) {
      await Slot.findByIdAndUpdate(bookedSlot._id, { $set: { status: "available" } });
      throw createError;
    }

    await cacheDel(
      `cache:user:appointments:${patientId}`,
      `cache:doctor:appointments:${doctorId}`,
      `cache:doctor:patients:${doctorId}`
    );

    return res.status(201).json({
      message: "Appointment confirmed",
      appointment: {
        _id: appointment._id,
        bookingId: requestGroupId,
      },
    });
  } catch (error) {
    console.error("bookSlotAppointment error:", error);
    return res.status(500).json({ message: "Server error", msg: "Server error" });
  }
};
