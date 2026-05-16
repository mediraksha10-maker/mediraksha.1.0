import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const COOKIE_OPTIONS = (req) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// sign up
export async function createUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ msg: 'name, email and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name: name.trim(), email: email.trim().toLowerCase(), password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: 'patient' }, process.env.JWT_SECRET, {
      expiresIn: '2d',
    });

    res.cookie('token', token, COOKIE_OPTIONS());
    res.status(201).json({ msg: 'User created successfully' });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ message: 'Internal Server error' });
  }
}

// sign in
export async function getUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ msg: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const passCorrect = await bcrypt.compare(password, user.password);
    if (!passCorrect) return res.status(400).json({ msg: 'Incorrect password' });

    const token = jwt.sign({ id: user._id, role: 'patient' }, process.env.JWT_SECRET, {
      expiresIn: '2d',
    });

    res.cookie('token', token, COOKIE_OPTIONS());
    // Do NOT return the raw token in the response body — cookie is the transport
    res.json({ msg: 'Login successful' });
  } catch (error) {
    console.error('getUser error:', error);
    res.status(500).json({ message: 'Internal Server error' });
  }
}

export const logout = (_req, res) => {
  // Must pass the same cookie attributes used when the cookie was set,
  // otherwise the browser ignores the clear request.
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.json({ msg: 'Logged out' });
};
