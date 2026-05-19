import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import mongoose from "mongoose";
import { cacheDel, cacheGet, cacheSet } from "../redis/cache.js";

const MAX_DOCTORS = 3;
const MAX_SEARCH_LIMIT = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseSearchLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 20;
  return Math.min(parsed, MAX_SEARCH_LIMIT);
};

// GET /api/home/doctors?name=&specialization=
export const searchDoctor = async (req, res) => {
  try {
    const { name, specialization, limit } = req.query;
    const normalizedName = (name || "").trim().toLowerCase();
    const normalizedSpecialization = (specialization || "").trim().toLowerCase();
    const searchLimit = parseSearchLimit(limit);
    const cacheKey = `cache:doctor:search:${normalizedName}:${normalizedSpecialization}:${searchLimit}`;

    const cachedDoctors = await cacheGet(cacheKey);
    if (cachedDoctors) {
      return res.status(200).json(cachedDoctors);
    }

    const filter = { isVerified: true };
    if (normalizedName) filter.name = { $regex: escapeRegex(normalizedName), $options: "i" };
    if (normalizedSpecialization) {
      filter.specialization = { $regex: escapeRegex(normalizedSpecialization), $options: "i" };
    }

    const doctors = await Doctor.find(filter)
      .select("name specialization hospital experience contact email")
      .limit(searchLimit)
      .lean();
    await cacheSet(cacheKey, doctors, 60);
    res.status(200).json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/home/my-doctors
export const getMyDoctors = async (req, res) => {
  try {
    const cacheKey = `cache:user:my-doctors:${req.user}`;
    const cachedDoctors = await cacheGet(cacheKey);
    if (cachedDoctors) {
      return res.status(200).json(cachedDoctors);
    }

    const user = await User.findById(req.user)
      .populate("registeredDoctors", "name specialization hospital experience contact email")
      .select("registeredDoctors");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const doctors = user?.registeredDoctors || [];
    await cacheSet(cacheKey, doctors, 120);
    res.status(200).json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// POST /api/home/my-doctors — add a doctor (max 3)
export const addMyDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;

    // Validate ObjectId before DB query to prevent CastError 500s
    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ msg: "Invalid doctorId" });
    }

    const doctor = await Doctor.findOne({ _id: doctorId, isVerified: true });
    if (!doctor) return res.status(404).json({ msg: "Doctor not found" });

    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.registeredDoctors.map(String).includes(String(doctorId))) {
      return res.status(409).json({ msg: "Doctor already registered" });
    }

    if (user.registeredDoctors.length >= MAX_DOCTORS) {
      return res.status(400).json({
        msg: `You can only register up to ${MAX_DOCTORS} doctors. Remove one first.`,
        limitReached: true,
      });
    }

    user.registeredDoctors.push(doctorId);
    await user.save();
    await user.populate("registeredDoctors", "name specialization hospital experience contact email");
    await cacheDel(
      `cache:user:my-doctors:${req.user}`,
      `cache:doctor:patients:${doctorId}`
    );

    res.status(200).json({
      msg: "Doctor registered successfully",
      doctors: user.registeredDoctors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// DELETE /api/home/my-doctors/:doctorId
export const removeMyDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Bug 14: Validate ObjectId to prevent CastError / 500 on malformed IDs
    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ msg: "Invalid doctorId" });
    }

    await User.findByIdAndUpdate(req.user, {
      $pull: { registeredDoctors: doctorId },
    });
    await cacheDel(
      `cache:user:my-doctors:${req.user}`,
      `cache:doctor:patients:${doctorId}`
    );

    res.status(200).json({ msg: "Doctor removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// PATCH /api/home/my-doctors/swap
export const swapMyDoctor = async (req, res) => {
  try {
    const { removeId, addId } = req.body;

    if (!mongoose.isValidObjectId(removeId) || !mongoose.isValidObjectId(addId)) {
      return res.status(400).json({ msg: "Invalid doctor id" });
    }

    if (String(removeId) === String(addId)) {
      return res.status(400).json({ msg: "Choose two different doctors to swap" });
    }

    const newDoctor = await Doctor.findOne({ _id: addId, isVerified: true });
    if (!newDoctor) return res.status(404).json({ msg: "Doctor not found" });

    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const currentDoctorIds = user.registeredDoctors.map(String);
    const hasDoctorToRemove = currentDoctorIds.includes(String(removeId));
    if (!hasDoctorToRemove) {
      return res.status(400).json({ msg: "Doctor to remove is not registered" });
    }

    if (currentDoctorIds.includes(String(addId))) {
      return res.status(409).json({ msg: "Doctor already registered" });
    }

    const nextDoctorIds = currentDoctorIds.filter((id) => id !== String(removeId));
    nextDoctorIds.push(addId);

    if (nextDoctorIds.length > MAX_DOCTORS) {
      return res.status(400).json({
        msg: `You can only register up to ${MAX_DOCTORS} doctors.`,
        limitReached: true,
      });
    }

    user.registeredDoctors = nextDoctorIds;
    await user.save();
    await user.populate("registeredDoctors", "name specialization hospital experience contact email");
    await cacheDel(
      `cache:user:my-doctors:${req.user}`,
      `cache:doctor:patients:${addId}`,
      `cache:doctor:patients:${removeId}`
    );

    res.status(200).json({
      msg: "Doctor swapped successfully",
      doctors: user.registeredDoctors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/doctor/patients
export const getMyPatients = async (req, res) => {
  try {
    const doctorId = req.user;
    const cacheKey = `cache:doctor:patients:${doctorId}`;

    const cachedPatients = await cacheGet(cacheKey);
    if (cachedPatients) {
      return res.status(200).json(cachedPatients);
    }

    // All users who registered this doctor (array field now)
    const patients = await User.find({ registeredDoctors: doctorId })
      .select("name age gender email phoneNumber contact");

    const patientsWithHistory = await Promise.all(
      patients.map(async (patient) => {
        const appointments = await Appointment.find({
          doctorId,
          patientId: patient._id,
        })
          .select("appointmentDate status reasonOfAppointment")
          .sort({ appointmentDate: -1 })
          .lean();

        const normalizedAppointments = appointments.map((appointment) => ({
          ...appointment,
          date: appointment.appointmentDate,
          startTime: "09:00",
          reason: appointment.reasonOfAppointment,
        }));

        return { ...patient.toObject(), appointments: normalizedAppointments };
      })
    );

    await cacheSet(cacheKey, patientsWithHistory, 120);
    res.status(200).json(patientsWithHistory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
