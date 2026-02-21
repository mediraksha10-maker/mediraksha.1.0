import User from "../models/User.js";
import Doctor from "../models/Doctor.js";

// GET /api/home/doctors?name=&specialization=  — search all doctors
export const searchDoctors = async (req, res) => {
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

// GET /api/home/my-doctor  — get patient's registered doctor
export const getMyDoctor = async (req, res) => {
  try {
    const user = await User.findById(req.user)
      .populate("registeredDoctor", "name specialization hospital experience contact email")
      .select("registeredDoctor");

    res.status(200).json(user.registeredDoctor || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// PATCH /api/home/my-doctor  — set or change registered doctor
export const setMyDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ msg: "Doctor not found" });

    const user = await User.findByIdAndUpdate(
      req.user,
      { registeredDoctor: doctorId },
      { new: true }
    ).populate("registeredDoctor", "name specialization hospital experience contact email");

    res.status(200).json({
      msg: "Doctor registered successfully",
      doctor: user.registeredDoctor,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// DELETE /api/home/my-doctor  — remove registered doctor
export const removeMyDoctor = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user, { registeredDoctor: null });
    res.status(200).json({ msg: "Doctor removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};