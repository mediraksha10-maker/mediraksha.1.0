import express from "express";
import doctor from '../models/Doctor.js';


import { getDoctorAppointments, updateAppointmentStatus } from "../controllers/appointmentController.js";


const router = express.Router();

router.get("/appointments", getDoctorAppointments);
router.patch("/appointments/:id", updateAppointmentStatus);



router.get('/', async (req, res) => {
    try {
        const myDet = await doctor.findById(req.user).select("-password"); // exclude password
        if (!myDet) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        res.status(200).json(myDet);

        
    } catch (error) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.patch('/details', async (req, res) => {
    try {
        const userId = req.user;
        const {name, hospital, age} = req.body;
        if (!name || !hospital || !age) {
            return res.status(400).json({ msg: 'Please provide all the details' });
        }

        // Update user details
        const updatedDoctor = await doctor.findByIdAndUpdate(
            userId,
            { name, hospital, age},
            { new: true, runValidators: true, select: "-password" }
        );

        if (!updatedDoctor) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json({
            msg: 'User details updated successfully',
            user: updatedDoctor
        });
    } catch (error) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
})


router.patch('/update', async (req, res) => {
    try {
        const userId = req.user;

        const { doctorId, name, age, hospital } = req.body;
        if (!name || !age || !doctorId || !hospital) {
            return res.status(400).json({ msg: 'Please provide all details' });
        }

        // Update user details
        const updatedDoctor = await doctor.findByIdAndUpdate(
            userId,
            { doctorId, name, hospital, age },
            { new: true, runValidators: true, select: "-password" }
        );

        if (!updatedDoctor) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json({
            msg: 'User details updated successfully',
            user: updatedDoctor
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

export default router;