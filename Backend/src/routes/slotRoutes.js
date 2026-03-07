import express from "express";
import {
  createSlots,
  getDoctorsWithSlots,
  getMySlotsByDoctor,
  getDoctorSlotsByDate,
  bookSlotAppointment,
} from "../controllers/slotController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createSlots);
router.post("/book", authMiddleware, bookSlotAppointment);
router.get("/my", authMiddleware, getMySlotsByDoctor);
router.get("/doctors", getDoctorsWithSlots);
router.get("/:doctorId/:date", authMiddleware, getDoctorSlotsByDate);

export default router;
