import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Slot from "../models/Slot.js";
import { cacheDel, cacheGet, cacheSet } from "../redis/cache.js";

const LEGACY_DEFAULT_START_TIME = "09:00";

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

    const normalizedAppointmentDate = normalizeDateOnly(appointmentDate);
    if (!normalizedAppointmentDate) {
      return res.status(400).json({ msg: "Invalid appointmentDate" });
    }

    const doctor = await Doctor.findById(doctorId);
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

    appointment.status = "cancelled";
    await appointment.save();
    if (appointment.slotId) {
      await Slot.findByIdAndUpdate(appointment.slotId, { status: "available" });
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
    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" };
    if (specialization) filter.specialization = { $regex: specialization, $options: "i" };

    const doctors = await Doctor.find(filter).select("name specialization hospital");
    res.status(200).json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};




// GET /api/doctor/appointments — all pending requests for this doctor
export const getDoctorAppointments = async (req, res) => {
  try {
    const cacheKey = `cache:doctor:appointments:${req.user}`;
    const cachedAppointments = await cacheGet(cacheKey);
    if (cachedAppointments) {
      return res.status(200).json(cachedAppointments);
    }

    const appointments = await Appointment.find({ doctorId: req.user })
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

// PATCH /api/doctor/appointments/:id — approve or deny
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body; // "confirmed" or "cancelled"

    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user,
    });

    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }
    if (appointment.status !== "pending") {
      return res.status(409).json({ msg: "Only pending requests can be updated" });
    }

    appointment.status = status;
    await appointment.save();

    if (status === "confirmed") {
      if (appointment.slotId) {
        await Slot.findByIdAndUpdate(appointment.slotId, { status: "booked" });
      }

      if (appointment.requestGroupId) {
        const siblings = await Appointment.find({
          requestGroupId: appointment.requestGroupId,
          doctorId: req.user,
          patientId: appointment.patientId,
          _id: { $ne: appointment._id },
          status: "pending",
        });

        const siblingSlotIds = siblings
          .map((item) => item.slotId)
          .filter(Boolean);

        if (siblings.length > 0) {
          await Appointment.updateMany(
            { _id: { $in: siblings.map((item) => item._id) } },
            { $set: { status: "cancelled" } }
          );
        }

        if (siblingSlotIds.length > 0) {
          await Slot.updateMany(
            { _id: { $in: siblingSlotIds } },
            { $set: { status: "available" } }
          );
        }
      }
    }

    if (status === "cancelled" && appointment.slotId) {
      await Slot.findByIdAndUpdate(appointment.slotId, { status: "available" });
    }

    await cacheDel(
      `cache:doctor:appointments:${req.user}`,
      `cache:user:appointments:${appointment.patientId}`,
      `cache:doctor:patients:${req.user}`
    );

    const dto = toDoctorAppointmentDTO(appointment.toObject());
    res.status(200).json({ msg: `Appointment ${status}`, appointment: dto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
