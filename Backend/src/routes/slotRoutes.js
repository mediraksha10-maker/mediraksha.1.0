import express from "express";
import {
  createSlots,
  getDoctorsWithSlots,
  getMySlotsByDoctor,
  getDoctorSlotsByDate,
  bookSlotAppointment,
} from "../controllers/slotController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireDoctor, requirePatient } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Doctor-only: create & view own slots
router.post("/create", authMiddleware, requireDoctor, createSlots);
router.get("/my",     authMiddleware, requireDoctor, getMySlotsByDoctor);

// Patient-only: book a slot
router.post("/book", authMiddleware, requirePatient, bookSlotAppointment);

// Public: anyone can see which doctors have slots available
router.get("/doctors", getDoctorsWithSlots);

// Any authenticated user can view slots for a specific doctor on a date
router.get("/:doctorId/:date", authMiddleware, getDoctorSlotsByDate);

export default router;
