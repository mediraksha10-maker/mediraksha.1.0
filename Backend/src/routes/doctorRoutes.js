import express from "express";
import doctor from '../models/Doctor.js';

import { getMyPatients } from "../controllers/doctorController.js";
import { getDoctorAppointments, updateAppointmentStatus } from "../controllers/appointmentController.js";
import { cacheDel, cacheDelByPrefix, cacheGet, cacheSet } from "../redis/cache.js";
import { isNonEmptyString, parseAge } from "../utils/validation.js";


const router = express.Router();



// doctor profile
router.get('/', async (req, res) => {
    try {
        const cacheKey = `cache:doctor:profile:${req.user}`;
        const cachedDoctor = await cacheGet(cacheKey);
        if (cachedDoctor) {
            return res.status(200).json(cachedDoctor);
        }

        const myDet = await doctor.findById(req.user).select("-password");
        if (!myDet) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        await cacheSet(cacheKey, myDet, 180);
        res.status(200).json(myDet);

        
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.patch('/details', async (req, res) => {
    try {
        const userId = req.user;
        const {name, hospital, age} = req.body;
        const parsedAge = parseAge(age);

        if (!isNonEmptyString(name) || !isNonEmptyString(hospital) || parsedAge === null) {
            return res.status(400).json({ msg: "Provide valid name, hospital and age (1-120)" });
        }

        // Update user details
        const updatedDoctor = await doctor.findByIdAndUpdate(
            userId,
            { name: name.trim(), hospital: hospital.trim(), age: parsedAge},
            { new: true, runValidators: true, select: "-password" }
        );

        if (!updatedDoctor) {
            return res.status(404).json({ msg: 'User not found' });
        }

        await cacheDel(`cache:doctor:profile:${req.user}`);
        await cacheDelByPrefix("cache:doctor:search:");
        res.status(200).json({
            msg: 'User details updated successfully',
            user: updatedDoctor
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
})


router.patch('/update', async (req, res) => {
    try {
        const userId = req.user;

        const { doctorId, name, age, hospital } = req.body;
        const parsedAge = parseAge(age);
        if (!isNonEmptyString(name) || !isNonEmptyString(doctorId) || !isNonEmptyString(hospital) || parsedAge === null) {
            return res.status(400).json({ msg: "Provide valid doctorId, name, hospital and age (1-120)" });
        }

        // Update user details
        const updatedDoctor = await doctor.findByIdAndUpdate(
            userId,
            { doctorId: doctorId.trim(), name: name.trim(), hospital: hospital.trim(), age: parsedAge },
            { new: true, runValidators: true, select: "-password" }
        );

        if (!updatedDoctor) {
            return res.status(404).json({ msg: 'User not found' });
        }

        await cacheDel(`cache:doctor:profile:${req.user}`);
        await cacheDelByPrefix("cache:doctor:search:");
        res.status(200).json({
            msg: 'User details updated successfully',
            user: updatedDoctor
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// appointments
router.get("/appointments", getDoctorAppointments);
router.patch("/appointments/:id", updateAppointmentStatus);
router.get("/patients", getMyPatients);     


export default router;
