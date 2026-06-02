import doctor from '../models/Doctor.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuthCookieOptions } from '../utils/cookieOptions.js';

import doctor from '../models/Doctor.js'
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { getAuthCookieOptions, getClearCookieOptions } from "../utils/cookieOptions.js";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;


// sign up
export async function createDoctor(req, res) {
  try {
    const { doctorId, password } = req.body;

        // set cookie
        res.cookie("token", token, getAuthCookieOptions());

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ msg: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const userExists = await doctor.findOne({ doctorId: doctorId.trim() });
    if (userExists) return res.status(400).json({ msg: 'Doctor already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new doctor({ doctorId: doctorId.trim(), password: hashedPassword });
    await newUser.save();

    res.status(201).json({
      msg: 'Doctor registration submitted. Please wait for admin verification before logging in.',
    });
  } catch (error) {
    console.error('createDoctor error:', error);
    res.status(500).json({ message: 'Internal Server error' });
  }
}

// sign in
export async function getDoctor(req, res) {
  try {
    const { doctorId, password } = req.body;

    if (!doctorId?.trim() || !password) {
      return res.status(400).json({ msg: 'doctorId and password are required' });
    }

    const user = await doctor.findOne({ doctorId: doctorId.trim() });
    if (!user) return res.status(404).json({ message: 'Doctor not found' });

        res.cookie("token", token, getAuthCookieOptions());

    if (!user.isVerified) {
      return res.status(403).json({
        msg: 'Your account is pending verification. Please contact the MediRaksha admin to get approved.',
      });
    }

export const logout = (req, res) => {
  res.clearCookie("token", getClearCookieOptions());
  res.json({ msg: "Logged out" });
};

