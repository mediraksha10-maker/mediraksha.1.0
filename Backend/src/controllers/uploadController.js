import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import Report, { REPORT_CATEGORIES, REPORT_VISIBILITY } from "../models/Report.js";

const conn = mongoose.connection;
let bucket;

conn.once("open", () => {
  bucket = new GridFSBucket(conn.db, { bucketName: "uploads" });
});

const hasAllowedFileSignature = (file) => {
  const bytes = file.buffer;
  if (!Buffer.isBuffer(bytes) || bytes.length < 4) return false;

  if (file.mimetype === "application/pdf") {
    return bytes.subarray(0, 4).toString("ascii") === "%PDF";
  }

  if (file.mimetype === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.mimetype === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (file.mimetype === "image/gif") {
    const header = bytes.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }

  if (file.mimetype === "image/webp") {
    return bytes.subarray(0, 4).toString("ascii") === "RIFF"
      && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }

  if (file.mimetype === "image/bmp") {
    return bytes.subarray(0, 2).toString("ascii") === "BM";
  }

  return false;
};

const sanitizeFileName = (value) => {
  const fallback = "report";
  const cleaned = String(value || fallback)
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/]/g, "_")
    .trim();

  return cleaned || fallback;
};

export async function uploadFile(req, res) {
  try {
    if (!bucket) {
      return res.status(503).json({ msg: "Upload service unavailable" });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "No file received" });
    }

    if (!hasAllowedFileSignature(req.file)) {
      return res.status(400).json({ msg: "File content does not match the selected file type" });
    }

    const { title, category, visibility = "private", doctorId = "", uploadedBy = "patient" } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ msg: "Report title is required" });
    }
    if (!REPORT_CATEGORIES.includes(category)) {
      return res.status(400).json({ msg: `Category must be one of: ${REPORT_CATEGORIES.join(", ")}` });
    }
    if (!REPORT_VISIBILITY.includes(visibility)) {
      return res.status(400).json({ msg: `Visibility must be one of: ${REPORT_VISIBILITY.join(", ")}` });
    }

    const generatedReportId = `RPT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const safeOriginalFileName = sanitizeFileName(req.file.originalname);
    const uploadStream = bucket.openUploadStream(safeOriginalFileName, {
      contentType: req.file.mimetype,
      metadata: {
        userId: req.user,
        reportId: generatedReportId,
        title: title.trim(),
        category,
        visibility,
        mimeType: req.file.mimetype,
      },
    });

    await new Promise((resolve, reject) => {
      uploadStream.on("finish", () => resolve());
      uploadStream.on("error", reject);
      uploadStream.end(req.file.buffer);
    });

    const gridFsFileId = uploadStream?.id ? String(uploadStream.id) : null;
    if (!gridFsFileId) {
      return res.status(500).json({ msg: "Upload failed: missing GridFS file id" });
    }

    const report = await Report.create({
      reportId: generatedReportId,
      patientId: String(req.user),
      uploadedBy: String(uploadedBy).trim() || "patient",
      doctorId: doctorId?.trim() || null,
      title: title.trim(),
      category,
      fileSize: req.file.size,
      fileId: gridFsFileId,
      visibility,
      originalFileName: safeOriginalFileName,
      mimeType: req.file.mimetype,
    });

    res.status(201).json({ msg: "File uploaded successfully", report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Upload failed" });
  }
}

export async function getAllFiles(req, res) {
  try {
    const reports = await Report.find({ patientId: String(req.user) })
      .sort({ createdAt: -1 })
      .lean();
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
}

export async function getFileById(req, res) {
  try {
    // Bug 11: Validate ObjectId before DB query to avoid CastError / 500 leak
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: "Invalid file ID" });
    }

    if (!bucket) {
      return res.status(503).json({ msg: "File service unavailable" });
    }

    const report = await Report.findOne({
      _id: req.params.id,
      patientId: String(req.user),
    }).lean();
    if (!report) return res.status(404).json({ msg: "File not found" });

    if (!mongoose.isValidObjectId(report.fileId)) {
      return res.status(500).json({ msg: "File record is corrupted" });
    }

    const fileObjectId = new mongoose.Types.ObjectId(report.fileId);
    const file = await bucket
      .find({ _id: fileObjectId })
      .toArray();
    if (!file.length) return res.status(404).json({ msg: "File not found in storage" });

    res.setHeader(
      "Content-Type",
      file[0].contentType || file[0]?.metadata?.mimeType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sanitizeFileName(report.originalFileName || file[0].filename || report.title)}"`
    );
    const downloadStream = bucket.openDownloadStream(file[0]._id);
    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
}

export async function deleteFile(req, res) {
  try {
    // Bug 11: Validate ObjectId before DB query
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: "Invalid file ID" });
    }

    const report = await Report.findOne({
      _id: req.params.id,
      patientId: String(req.user),
    });
    if (!report) return res.status(404).json({ msg: "File not found" });

    if (bucket && mongoose.isValidObjectId(report.fileId)) {
      await bucket.delete(new mongoose.Types.ObjectId(report.fileId));
    }
    await report.deleteOne();
    res.status(200).json({ msg: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
}
