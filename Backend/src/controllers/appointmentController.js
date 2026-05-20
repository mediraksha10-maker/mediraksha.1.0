import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Slot from "../models/Slot.js";
import mongoose from "mongoose";
import { cacheDel, cacheGet, cacheSet } from "../redis/cache.js";

const LEGACY_DEFAULT_START_TIME = "09:00";
const DOCTOR_VISIBLE_STATUSES = ["confirmed", "cancelled"];

const getStartTime = (slotTime) => {
  if (!slotTime || typeof slotTime !== "string") return LEGACY_DEFAULT_START_TIME;
  const [start] = slotTime.split("-").map((v) => v?.trim());
  return start || LEGACY_DEFAULT_START_TIME;
};

const normalizeDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPatientAppointmentDTO = (appointment) => {
  const doctorName = appointment.doctorName;
  const speciality = appointment.speciality;
  const hospitalName = appointment.hospitalName;

  return {
    ...appointment,
    doctorName,
    speciality,
    hospitalName,
    // Legacy compatibility for existing UI pieces.
    date: appointment.appointmentDate,
    startTime: getStartTime(appointment.slotTime),
    reason: appointment.reasonOfAppointment,
    doctor: {
      name: doctorName,
      specialization: speciality,
      hospital: hospitalName,
    },
  };
};

const toDoctorAppointmentDTO = (appointment) => ({
  ...appointment,
  patient: appointment.patientId,
  // Legacy compatibility for existing doctor views.
  date: appointment.appointmentDate,
  startTime: getStartTime(appointment.slotTime),
  reason: appointment.reasonOfAppointment,
});

const filterDoctorVisibleAppointments = (appointments) =>
  appointments.filter((appointment) => DOCTOR_VISIBLE_STATUSES.includes(appointment.status));

// POST /api/user/appointments — book an appointment
export const bookAppointment = async (req, res) => {
  try {
    const patientId = req.user;
    const { doctorId, appointmentDate, reasonOfAppointment } = req.body;

    if (!doctorId || !appointmentDate || !reasonOfAppointment?.trim()) {
      return res.status(400).json({
        msg: "doctorId, appointmentDate and reasonOfAppointment are required",
      });
    }

    // Bug 9: Validate doctorId is a real ObjectId before DB query
    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ msg: "Invalid doctorId" });
    }

    const normalizedAppointmentDate = normalizeDateOnly(appointmentDate);
    if (!normalizedAppointmentDate) {
      return res.status(400).json({ msg: "Invalid appointmentDate" });
    }

    const doctor = await Doctor.findOne({ _id: doctorId, isVerified: true });
    if (!doctor) {
      return res.status(404).json({ msg: "Doctor not found" });
    }

    const conflict = await Appointment.findOne({
      doctorId,
      appointmentDate: normalizedAppointmentDate,
      status: { $ne: "cancelled" },
    });
    if (conflict) {
      return res.status(409).json({
        msg: "This doctor already has an active appointment on that date",
      });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      doctorName: doctor.name?.trim() || "Unknown Doctor",
      speciality: doctor.specialization?.trim() || "General Medicine",
      hospitalName: doctor.hospital?.trim() || "Unknown Hospital",
      appointmentDate: normalizedAppointmentDate,
      reasonOfAppointment: reasonOfAppointment.trim(),
      status: "confirmed",
    });

    await cacheDel(
      `cache:user:appointments:${patientId}`,
      `cache:doctor:appointments:${doctorId}`,
      `cache:doctor:patients:${doctorId}`
    );

    const dto = toPatientAppointmentDTO(appointment.toObject());
    res.status(201).json({ msg: "Appointment booked", appointment: dto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/user/appointments — get all appointments for logged-in patient
export const getMyAppointments = async (req, res) => {
  try {
    const cacheKey = `cache:user:appointments:${req.user}`;
    const cachedAppointments = await cacheGet(cacheKey);
    if (cachedAppointments) {
      return res.status(200).json(cachedAppointments);
    }

    const appointments = await Appointment.find({ patientId: req.user })
      .sort({ appointmentDate: 1 })
      .lean();

    const payload = appointments.map(toPatientAppointmentDTO);
    await cacheSet(cacheKey, payload, 120);
    res.status(200).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// DELETE /api/user/appointments/:id — cancel an appointment
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: req.user,
    });
    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    // Bug 10: Save the appointment status change FIRST before freeing the slot.
    // This prevents the slot from being freed if the appointment save fails.
    appointment.status = "cancelled";
    await appointment.save();

    // Free the slot only after the appointment is durably cancelled.
    if (appointment.slotId) {
      try {
        await Slot.findByIdAndUpdate(appointment.slotId, { status: "available" });
      } catch (slotErr) {
        // Log the failure but don't roll back — the appointment is already cancelled.
        // The slot will be stuck as "booked" but the appointment won't be in limbo.
        console.error(
          `cancelAppointment: failed to free slot ${appointment.slotId}:`,
          slotErr.message
        );
      }
    }

    await cacheDel(
      `cache:user:appointments:${req.user}`,
      `cache:doctor:appointments:${appointment.doctorId}`,
      `cache:doctor:patients:${appointment.doctorId}`
    );

    const dto = toPatientAppointmentDTO(appointment.toObject());
    res.status(200).json({ msg: "Appointment cancelled", appointment: dto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/user/appointments/doctors — search doctors to book with
export const searchDoctors = async (req, res) => {
  try {
    const { name, specialization } = req.query;
    const filter = { isVerified: true };
    if (name?.trim()) filter.name = { $regex: escapeRegex(name.trim()), $options: "i" };
    if (specialization?.trim()) {
      filter.specialization = { $regex: escapeRegex(specialization.trim()), $options: "i" };
    }

    const doctors = await Doctor.find(filter).select("name specialization hospital").limit(50);
    res.status(200).json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/doctor/appointments — all appointments for this doctor
export const getDoctorAppointments = async (req, res) => {
  try {
    const cacheKey = `cache:doctor:appointments:${req.user}`;
    const cachedAppointments = await cacheGet(cacheKey);
    if (cachedAppointments) {
      return res.status(200).json(filterDoctorVisibleAppointments(cachedAppointments));
    }

    const appointments = await Appointment.find({
      doctorId: req.user,
      status: { $in: DOCTOR_VISIBLE_STATUSES },
    })
      .populate("patientId", "name age gender phoneNumber")
      .sort({ appointmentDate: 1 })
      .lean();

    const payload = appointments.map(toDoctorAppointmentDTO);
    await cacheSet(cacheKey, payload, 120);
    res.status(200).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
