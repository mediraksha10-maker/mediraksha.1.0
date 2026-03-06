import mongoose from 'mongoose'
import { AGE_MAX, AGE_MIN } from "../utils/validation.js";

const schema = new mongoose.Schema({
        doctorId: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
            trim: true,
        },
        hospital: {
            type: String,
            trim: true,
        },
        age: {
            type: Number,
            min: AGE_MIN,
            max: AGE_MAX,
            validate: {
                validator: Number.isInteger,
                message: "Age must be a whole number"
            }
        },
        password: {
            type: String,
            required: true
        }
    },
    {timestamps: true}
);

const doctor = mongoose.model('doctor', schema);
export default doctor;
