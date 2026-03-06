import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import Report, { REPORT_CATEGORIES, REPORT_VISIBILITY } from "../models/Report.js";

const conn = mongoose.connection;
let bucket;

conn.once("open", () => {
  bucket = new GridFSBucket(conn.db, { bucketName: "uploads" });
});

export async function uploadFile(req, res) {
  try {
    if (!bucket) {
      return res.status(503).json({ msg: "Upload service unavailable" });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "No file received" });
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
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
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
      originalFileName: req.file.originalname,
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
    if (!bucket) {
      return res.status(503).json({ msg: "File service unavailable" });
    }

    const report = await Report.findOne({
      _id: req.params.id,
      patientId: String(req.user),
    }).lean();
    if (!report) return res.status(404).json({ msg: "File not found" });

    const fileObjectId = new mongoose.Types.ObjectId(report.fileId);
    const file = await bucket
      .find({ _id: fileObjectId })
      .toArray();
    if (!file.length) return res.status(404).json({ msg: "File not found" });

    res.setHeader(
      "Content-Type",
      file[0].contentType || file[0]?.metadata?.mimeType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${report.originalFileName || file[0].filename || report.title}"`
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
