import doctor from '../models/Doctor.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuthCookieOptions } from '../utils/cookieOptions.js';

const MIN_PASSWORD_LENGTH = 8;

// sign up
export async function createDoctor(req, res) {
  try {
    const { doctorId, password } = req.body;

    if (!doctorId?.trim() || !password) {
      return res.status(400).json({ msg: 'doctorId and password are required' });
    }

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

    const passCorrect = await bcrypt.compare(password, user.password);
    if (!passCorrect) return res.status(400).json({ msg: 'Incorrect password' });

    if (!user.isVerified) {
      return res.status(403).json({
        msg: 'Your account is pending verification. Please contact the MediRaksha admin to get approved.',
      });
    }

    const token = jwt.sign({ id: user._id, role: 'doctor' }, process.env.JWT_SECRET, {
      expiresIn: '2d',
    });

    res.cookie('token', token, getAuthCookieOptions());
    res.json({ msg: 'Login successful' });
  } catch (error) {
    console.error('getDoctor error:', error);
    res.status(500).json({ message: 'Internal Server error' });
  }
}

export const logout = (_req, res) => {
  // Must pass the same cookie attributes used when the cookie was set,
  // otherwise the browser ignores the clear request.
  res.clearCookie('token', {
    ...getAuthCookieOptions({ includeMaxAge: false }),
  });
  res.json({ msg: 'Logged out' });
};
