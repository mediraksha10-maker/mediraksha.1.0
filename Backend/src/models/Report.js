import mongoose from "mongoose";

const REPORT_CATEGORIES = [
  "lab",
  "prescription",
  "scan",
  "discharge",
  "other",
];

const REPORT_VISIBILITY = ["private", "doctor", "public"];

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    uploadedBy: {
      type: String,
      required: true,
      trim: true,
      default: "patient",
    },
    doctorId: {
      type: String,
      default: null,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: REPORT_CATEGORIES,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    visibility: {
      type: String,
      required: true,
      enum: REPORT_VISIBILITY,
      default: "private",
      trim: true,
    },
    originalFileName: {
      type: String,
      trim: true,
      default: "",
    },
    mimeType: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

export { REPORT_CATEGORIES, REPORT_VISIBILITY };
export default Report;
