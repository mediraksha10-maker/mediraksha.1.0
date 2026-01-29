import express from 'express';
import { uploadFile, getAllFiles, getFileById, deleteFile } from '../controllers/uploadController.js';
import User from '../models/User.js';

const router = express.Router();

import multer from 'multer';

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
export const upload = multer({ storage }); 


router.get('/', async (req, res) => {
    try {
        // Find user by ID
        const myDet = await User.findById(req.user).select("-password"); // exclude password
        if (!myDet) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json(myDet);

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.patch('/details', async (req, res) => {
    try {

        const userId = req.user;

        // Extract details from request body
        const { gender, age } = req.body;
        if (!gender || !age) {
            return res.status(400).json({ msg: 'Please provide both gender and age' });
        }

        // Update user details
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { gender, age },
            { new: true, runValidators: true, select: "-password" }
        );

        if (!updatedUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json({
            msg: 'User details updated successfully',
            user: updatedUser
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.patch('/update', async (req, res) => {
    try {
        const userId = req.user;

        // Extract details from request body
        const { gender, age, name } = req.body;
        if (!gender || !age) {
            return res.status(400).json({ msg: 'Please provide both gender and age' });
        }

        // Update user details
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {name, gender, age},
            { new: true, runValidators: true, select: "-password" }
        );

        if (!updatedUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json({
            msg: 'User details updated successfully',
            user: updatedUser
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Upload routes
router.post('/upload', upload.single('report'), uploadFile);   // Upload a file
router.get('/files', getAllFiles);                             // List user files
router.get('/file/:id', getFileById);                          // Download file
router.delete('/file/:id', deleteFile);                        // Delete file

export default router;