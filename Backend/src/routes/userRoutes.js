import express from "express";
import multer from "multer";

// Controllers
import { uploadFile, getAllFiles, getFileById, deleteFile } from "../controllers/uploadController.js";
import { bookAppointment, getMyAppointments, cancelAppointment } from "../controllers/appointmentController.js";
import { searchDoctor, getMyDoctors, addMyDoctor, removeMyDoctor, swapMyDoctor } from "../controllers/doctorController.js";
import User from "../models/User.js";
import { cacheDel, cacheGet, cacheSet } from "../redis/cache.js";
import {
  isNonEmptyString,
  isValidGender,
  isValidPhoneNumber,
  parseAge,
} from "../utils/validation.js";

const router = express.Router();

const storage = multer.memoryStorage();
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
]);

export const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PDF and image files are allowed"));
    }
    cb(null, true);
  },
});

/* ───────────── USER PROFILE ───────────── */

router.get("/", async (req, res) => {
  try {
    const cacheKey = `cache:user:profile:${req.user}`;
    const cachedUser = await cacheGet(cacheKey);
    if (cachedUser) {
      return res.status(200).json(cachedUser);
    }

    const myDet = await User.findById(req.user).select("-password");
    if (!myDet) return res.status(404).json({ msg: "User not found" });

    await cacheSet(cacheKey, myDet, 180);
    res.status(200).json(myDet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.patch("/details", async (req, res) => {
  try {
    const { gender, age, phoneNumber } = req.body;
    const parsedAge = parseAge(age);
    if (!isValidGender(gender) || parsedAge === null || !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        msg: "Provide valid gender (Male/Female/Other), age (1-120) and a 10-digit phone number",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user,
      { gender, age: parsedAge, phoneNumber: phoneNumber.trim() },
      { new: true, runValidators: true, select: "-password" }
    );
    if (!updatedUser) return res.status(404).json({ msg: "User not found" });

    await cacheDel(`cache:user:profile:${req.user}`);
    res.status(200).json({ msg: "User details updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.patch("/update", async (req, res) => {
  try {
    const { gender, age, name, phoneNumber } = req.body;
    const parsedAge = parseAge(age);
    if (!isValidGender(gender) || parsedAge === null) {
      return res.status(400).json({
        msg: "Provide valid gender (Male/Female/Other) and age (1-120)",
      });
    }

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ msg: "Name is required" });
    }

    if (phoneNumber !== undefined && !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ msg: "Phone number must be exactly 10 digits" });
    }

    const updatePayload = {
      name: name.trim(),
      gender,
      age: parsedAge,
    };

    if (phoneNumber !== undefined) {
      updatePayload.phoneNumber = phoneNumber.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user,
      updatePayload,
      { new: true, runValidators: true, select: "-password" }
    );
    if (!updatedUser) return res.status(404).json({ msg: "User not found" });

    await cacheDel(`cache:user:profile:${req.user}`);
    res.status(200).json({ msg: "User details updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ───────────── FILE UPLOAD ───────────── */

router.post("/upload", (req, res, next) => {
  upload.single("report")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ msg: "File size must be 5MB or less" });
    }

    return res.status(400).json({ msg: err.message || "Invalid file upload" });
  });
}, uploadFile);
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
