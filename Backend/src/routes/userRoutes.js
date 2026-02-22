import express from "express";
import multer from "multer";

// Controllers
import { uploadFile, getAllFiles, getFileById, deleteFile } from "../controllers/uploadController.js";
import { bookAppointment, getMyAppointments, cancelAppointment } from "../controllers/appointmentController.js";
import { searchDoctor, getMyDoctors, addMyDoctor, removeMyDoctor, swapMyDoctor } from "../controllers/doctorController.js";
import User from "../models/User.js";

const router = express.Router();

const storage = multer.memoryStorage();
export const upload = multer({ storage });

/* ───────────── USER PROFILE ───────────── */

router.get("/", async (req, res) => {
  try {
    const myDet = await User.findById(req.user).select("-password");
    if (!myDet) return res.status(404).json({ msg: "User not found" });
    res.status(200).json(myDet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.patch("/details", async (req, res) => {
  try {
    const { gender, age } = req.body;
    if (!gender || !age)
      return res.status(400).json({ msg: "Please provide both gender and age" });

    const updatedUser = await User.findByIdAndUpdate(
      req.user,
      { gender, age },
      { new: true, runValidators: true, select: "-password" }
    );
    if (!updatedUser) return res.status(404).json({ msg: "User not found" });

    res.status(200).json({ msg: "User details updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.patch("/update", async (req, res) => {
  try {
    const { gender, age, name } = req.body;
    if (!gender || !age)
      return res.status(400).json({ msg: "Please provide both gender and age" });

    const updatedUser = await User.findByIdAndUpdate(
      req.user,
      { name, gender, age },
      { new: true, runValidators: true, select: "-password" }
    );
    if (!updatedUser) return res.status(404).json({ msg: "User not found" });

    res.status(200).json({ msg: "User details updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ───────────── FILE UPLOAD ───────────── */

router.post("/upload", upload.single("report"), uploadFile);
router.get("/files", getAllFiles);
router.get("/file/:id", getFileById);
router.delete("/file/:id", deleteFile);

/* ───────────── APPOINTMENTS ───────────── */

router.get("/appointments/doctors", searchDoctor);       // reuses doctor search
router.get("/appointments", getMyAppointments);
router.post("/appointments", bookAppointment);
router.delete("/appointments/:id", cancelAppointment);

/* ───────────── DOCTORS ───────────── */

router.get("/doctors", searchDoctor);                    // Search doctors
router.get("/my-doctors", getMyDoctors);                 // Get all registered doctors
router.post("/my-doctors", addMyDoctor);                 // Add a doctor (max 3)
router.patch("/my-doctors/swap", swapMyDoctor);          // Swap one out  ← must be before :doctorId
router.delete("/my-doctors/:doctorId", removeMyDoctor);  // Remove one doctor

export default router;