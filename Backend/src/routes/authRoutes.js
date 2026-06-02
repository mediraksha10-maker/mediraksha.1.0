import express from "express"
import { getUser, createUser, googleAuth, logout } from "../controllers/authController.js";
import { getDoctor, createDoctor } from "../controllers/doctorAuthController.js";

const router = express.Router();

router.post('/', createUser);
router.post('/login', getUser);
router.post('/google', googleAuth);
router.post('/logout', logout);
router.post('/doctor', createDoctor);
router.post('/doctor/login', getDoctor);
// /chat was moved to /api/home/chat (protected — requires patient auth)

export default router;
