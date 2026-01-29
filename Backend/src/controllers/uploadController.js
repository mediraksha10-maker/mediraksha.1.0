import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

const conn = mongoose.connection;
let bucket;

conn.once('open', () => {
  bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
});

export async function uploadFile(req, res) {
  try {
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: { userId: req.user },
    });
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', (file) => {
      res.status(201).json({ msg: 'File uploaded successfully', file });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Upload failed' });
  }
}

export async function getAllFiles (req, res) {
  try {
    const files = await bucket.find({ 'metadata.userId': req.user }).toArray();
    if (!files.length) return res.status(404).json({ msg: 'No files found' });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export async function getFileById (req, res) {
  try {
    const file = await bucket
      .find({ _id: new mongoose.Types.ObjectId(req.params.id) })
      .toArray();
    if (!file.length) return res.status(404).json({ msg: 'File not found' });

    // Ownership check
    if (file[0].metadata.userId !== req.user) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const downloadStream = bucket.openDownloadStream(file[0]._id);
    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
}


export async function deleteFile (req, res) {
  try {
    const file = await bucket
      .find({ _id: new mongoose.Types.ObjectId(req.params.id) })
      .toArray();
    if (!file.length) return res.status(404).json({ msg: 'File not found' });

    // Ownership check
    if (file[0].metadata.userId !== req.user) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    await bucket.delete(new mongoose.Types.ObjectId(req.params.id));
    res.status(200).json({ msg: 'File deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
}