import mongoose from 'mongoose'

const schema = new mongoose.Schema({
        doctorId: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
        },
        hospital: {
            type: String,
        },
        age: {
            type: Number,
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