import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function UploadReport() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  const API_URL = '/home';

  const fetchFiles = async () => {
    try {
      const res = await axiosInstance.get(`${API_URL}/files`);
      setFiles(res.data);
    } catch (error) {
      console.error(error);
      setFiles([]);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert('Please select a file first');

    const formData = new FormData();
    formData.append('report', file);

    try {
      const res = await axiosInstance.post(
        `${API_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessage(res.data.msg);
      setFile(null);
      fetchFiles();
    } catch (error) {
      console.error(error);
      setMessage('Upload failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`${API_URL}/file/${id}`);
      setMessage('File deleted');
      fetchFiles();
    } catch (error) {
      console.error(error);
      setMessage('Delete failed');
    }
  };

  const handlePreview = async (id, filename) => {
    try {
      const res = await axiosInstance.get(
        `${API_URL}/file/${id}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: res.data.type });
      const url = URL.createObjectURL(blob);

      if (/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename)) {
        setPreviewType('image');
      } else if (/\.pdf$/i.test(filename)) {
        setPreviewType('pdf');
      } else {
        setPreviewType('other');
      }

      setPreviewFile(url);
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  return (
    <>
      <div className="card bg-base-200 p-4 shadow-md w-[70%] justify-self-center my-10">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-xl font-semibold mt-4">Upload Medical Report</h2>
        <p className='text-red-400 mb-4'>Only images supported</p>
        <input
          onChange={handleFileChange}
          type="file"
          className="file-input file-input-bordered w-full"
        />

        <button className="btn btn-primary mt-4" onClick={handleUpload}>
          Upload
        </button>

        {message && <p className="mt-2 text-green-600">{message}</p>}

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Uploaded Files</h3>

          {files.length > 0 ? (
            <ul className="list-disc pl-5">
              {files.map((f) => (
                <li key={f._id} className="mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      className="text-blue-500 underline"
                      onClick={() => handlePreview(f._id, f.filename)}
                    >
                      Preview
                    </button>

                    <span>{f.filename}</span>

                    <button
                      className="btn btn-error btn-sm"
                      onClick={() => handleDelete(f._id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No files uploaded yet.</p>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-4xl w-full h-[80vh] relative">
            <button
              className="absolute top-2 right-2 btn btn-sm btn-error"
              onClick={() => {
                URL.revokeObjectURL(previewFile);
                setPreviewFile(null);
              }}
            >
              Close
            </button>

            {previewType === 'image' && (
              <img
                src={previewFile}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}

            {previewType === 'pdf' && (
              <PdfViewer fileUrl={previewFile} />
            )}

            {previewType === 'other' && (
              <p className="text-center mt-10">
                File preview not supported.{' '}
                <a
                  href={previewFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  Download instead
                </a>
              </p>
            )}
          </div>
        </div>
      )}

    </>
  );
}
