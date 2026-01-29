
import doctor from '../models/Doctor.js'
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;


// sign up
export async function createDoctor(req, res) {
    try {
        const { email, password } = req.body;
        const userExists = await doctor.findOne({ email });
        if (userExists) return res.status(400).json({ msg: 'User already exists' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new doctor({ email, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, JWT_SECRET, {
            expiresIn: "2d",
        });

        // set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({msg:"User created successfully"});
    } catch (error) {
        console.log("Error in the app ", error);
        res.status(500).json({ message: "Internal Server error" });
    }
}


// sign in
export async function getDoctor(req, res) {
    try {
        const { email, password } = req.body;
        const user = await doctor.findOne({ email });
        if (!user) return res.status(404).json({ message: "user not found" });
        const passCorrect = await bcrypt.compare(password, user.password);
        if (!passCorrect) return res.status(400).json({ msg: 'password not correct' });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, {
            expiresIn: "2d",
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ msg: "Login successful" });
    } catch (error) {
        console.log("Error in the app ", error);
        res.status(500).json({ message: "Internal Server error" });
    }
}

export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ msg: "Logged out" });
};


