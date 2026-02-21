import Meeting from '../models/Meeting.js';
import Doctor from '../models/Doctor.js';

// POST /api/user/appointments — book a meeting
export const bookAppointment = async (req, res) => {
  try {
    const patientId = req.user; // set by your auth middleware
    const { doctorId, date, startTime, reason } = req.body;

    if (!doctorId || !date || !startTime) {
      return res.status(400).json({ msg: 'doctorId, date and startTime are required' });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ msg: 'Doctor not found' });
    }

    // Check for conflicting appointment (same doctor, same date, same startTime)
    const conflict = await Meeting.findOne({ doctor: doctorId, date, startTime, status: { $ne: 'cancelled' } });
    if (conflict) {
      return res.status(409).json({ msg: 'This time slot is already booked' });
    }

    const meeting = await Meeting.create({
      patient: patientId,
      doctor: doctorId,
      date,
      startTime,
      reason,
    });

    // Populate for response
    await meeting.populate('doctor', 'name specialization');

    res.status(201).json({ msg: 'Appointment booked', meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// GET /api/user/appointments — get all appointments for logged-in patient
export const getMyAppointments = async (req, res) => {
  try {
    const meetings = await Meeting.find({ patient: req.user })
      .populate('doctor', 'name specialization')
      .sort({ date: 1 });

    res.status(200).json(meetings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// DELETE /api/user/appointments/:id — cancel an appointment
export const cancelAppointment = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, patient: req.user });
    if (!meeting) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    res.status(200).json({ msg: 'Appointment cancelled', meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// GET /api/user/appointments/doctors — search doctors to book with
export const searchDoctors = async (req, res) => {
  try {
    const { name, specialization } = req.query;
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };

    const doctors = await Doctor.find(filter).select('name specialization');
    res.status(200).json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};




// GET /api/doctor/appointments — all pending requests for this doctor
export const getDoctorAppointments = async (req, res) => {
  try {
    const meetings = await Meeting.find({ doctor: req.user })
      .populate("patient", "name age gender")
      .sort({ date: 1 });

    res.status(200).json(meetings);
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

    const meeting = await Meeting.findOne({
      _id: req.params.id,
      doctor: req.user,
    });

    if (!meeting) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    meeting.status = status;
    await meeting.save();

    res.status(200).json({ msg: `Appointment ${status}`, meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};