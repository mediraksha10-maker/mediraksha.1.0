import express from "express";
import { createSlots, getDoctorsWithSlots, getMySlotsByDoctor } from "../controllers/slotController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createSlots);
router.get("/my", authMiddleware, getMySlotsByDoctor);
router.get("/doctors", getDoctorsWithSlots);

export default router;
