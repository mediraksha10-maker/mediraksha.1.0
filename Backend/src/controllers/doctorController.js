import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Meeting from "../models/Meeting.js";

const MAX_DOCTORS = 3;

// GET /api/home/doctors?name=&specialization=
export const searchDoctor = async (req, res) => {
  try {
    const { name, specialization } = req.query;
    const filter = {};
    if (name)           filter.name           = { $regex: name, $options: "i" };
    if (specialization) filter.specialization = { $regex: specialization, $options: "i" };

    const doctors = await Doctor.find(filter).select(
      "name specialization hospital experience contact email"
    );
    res.status(200).json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/home/my-doctors
export const getMyDoctors = async (req, res) => {
  try {
    const user = await User.findById(req.user)
      .populate("registeredDoctors", "name specialization hospital experience contact email")
      .select("registeredDoctors");

    res.status(200).json(user.registeredDoctors || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// POST /api/home/my-doctors — add a doctor (max 3)
export const addMyDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ msg: "Doctor not found" });

    const user = await User.findById(req.user);

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

    await User.findByIdAndUpdate(req.user, {
      $pull: { registeredDoctors: doctorId },
    });

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

    const newDoctor = await Doctor.findById(addId);
    if (!newDoctor) return res.status(404).json({ msg: "Doctor not found" });

    const user = await User.findById(req.user);

    user.registeredDoctors = user.registeredDoctors
      .map(String)
      .filter((id) => id !== String(removeId));

    if (!user.registeredDoctors.map(String).includes(String(addId))) {
      user.registeredDoctors.push(addId);
    }

    await user.save();
    await user.populate("registeredDoctors", "name specialization hospital experience contact email");

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

    // All users who registered this doctor (array field now)
    const patients = await User.find({ registeredDoctors: doctorId })
      .select("name age gender email contact");

    const patientsWithHistory = await Promise.all(
      patients.map(async (patient) => {
        const appointments = await Meeting.find({
          doctor: doctorId,
          patient: patient._id,
        })
          .select("date startTime status reason")
          .sort({ date: -1 });

        return { ...patient.toObject(), appointments };
      })
    );

    res.status(200).json(patientsWithHistory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};