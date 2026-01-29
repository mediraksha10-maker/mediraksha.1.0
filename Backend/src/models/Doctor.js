import mongoose from 'mongoose'

const schema = new mongoose.Schema({
        doctorId: {
            type: String,
            required: true,
            unique: true
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