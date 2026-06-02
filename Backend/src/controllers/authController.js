import User from '../models/User.js'
import doctor from '../models/Doctor.js'
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { getAuthCookieOptions, getClearCookieOptions } from "../utils/cookieOptions.js";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const MIN_PASSWORD_LENGTH = 8;
const sanitizeEmail = (email) => email.trim().toLowerCase();

const createPatientToken = (userId) =>
  jwt.sign({ id: userId, role: 'patient' }, process.env.JWT_SECRET, {
    expiresIn: '2d',
  });

const toSafeUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  gender: user.gender,
  age: user.age,
  phoneNumber: user.phoneNumber,
});

const verifyGoogleToken = async (token) => {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    throw new Error('Google token verification failed');
  }

  const payload = await response.json();
  const expectedAudience = process.env.GOOGLE_CLIENT_ID;

  if (expectedAudience && payload.aud !== expectedAudience) {
    throw new Error('Google token audience mismatch');
  }

  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('Google email is not verified');
  }

  if (!payload.email) {
    throw new Error('Google account did not provide an email');
  }

  return payload;
};

// sign up
export async function createUser(req, res) {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ msg: 'User already exists' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, JWT_SECRET, {
            expiresIn: "2d",
        });

        // set cookie
        res.cookie("token", token, getAuthCookieOptions());

        res.status(201).json({msg:"User created successfully"});
    } catch (error) {
        console.log("Error in the app ", error);
        res.status(500).json({ message: "Internal Server error" });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ msg: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const normalizedEmail = sanitizeEmail(email);
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name: name.trim(), email: normalizedEmail, password: hashedPassword });
    await newUser.save();

    const token = createPatientToken(newUser._id);

    res.cookie('token', token, getAuthCookieOptions());
    res.status(201).json({ msg: 'User created successfully' });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ message: 'Internal Server error' });
  }
}

// sign in
export async function getUser(req, res) {
    try {
        const { name, email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "user not found" });
        const passCorrect = await bcrypt.compare(password, user.password);
        if (!passCorrect) return res.status(400).json({ msg: 'password not correct' });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, {
            expiresIn: "2d",
        });

        res.cookie("token", token, getAuthCookieOptions());

        res.json({ msg: token });
    } catch (error) {
        console.log("Error in the app ", error);
        res.status(500).json({ message: "Internal Server error" });
    }

    const user = await User.findOne({ email: sanitizeEmail(email) });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const passCorrect = await bcrypt.compare(password, user.password);
    if (!passCorrect) return res.status(400).json({ msg: 'Incorrect password' });

    const token = createPatientToken(user._id);

    res.cookie('token', token, getAuthCookieOptions());
    res.json({ msg: 'Login successful' });
  } catch (error) {
    console.error('getUser error:', error);
    res.status(500).json({ message: 'Internal Server error' });
  }
}

export const logout = (req, res) => {
  res.clearCookie("token", getClearCookieOptions());
  res.json({ msg: "Logged out" });
};

