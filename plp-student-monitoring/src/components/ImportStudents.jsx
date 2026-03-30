// frontend/src/components/ImportStudents.jsx

import React, { useState } from 'react';
import axios from 'axios';
import {
  IoClose,
  IoCloudUploadOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoDocumentTextOutline,
} from 'react-icons/io5';
import '../componentscss/ImportStudents.css';
import '../css/GlobalModal.css';

const ImportStudents = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | 'uploading' | null
  const [errorMessage, setErrorMessage] = useState('');
  const [errorList, setErrorList]  = useState([]); 
  const [successSummary, setSuccessSummary] = useState(null); 

  const requiredColumns = [
    'Student ID',
    'First Name',
    'Middle Name',  
    'Last Name',
    'College Department',
    'Year Level',
    'Enrollment Status',
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  // Client-side file validation 
  const validateAndSetFile = (selectedFile) => {
    setUploadStatus(null);
    setErrorMessage('');
    setErrorList([]);
    setSuccessSummary(null);

    if (!selectedFile) return;

    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'xlsx') {
      setUploadStatus('error');
      setErrorMessage('Please upload only .csv or .xlsx files');
      return;
    }

    if (selectedFile.size > 6 * 1024 * 1024) {
      setUploadStatus('error');
      setErrorMessage('File size should not exceed 6MB');
      return;
    }

    setFile(selectedFile);
    setUploadStatus('success');
  };

  // Main upload handler 
  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setErrorMessage('');
    setErrorList([]);
    setSuccessSummary(null);

    const formData = new FormData();
    formData.append('file', file); 

    try {
      const response = await axios.post(
        'http://localhost:5000/api/import-students',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;

      setUploadStatus('done');
      setSuccessSummary({
        inserted: data.inserted,
        failed: data.failed,
        message: data.message,
      });

      // Students.jsx to refresh the table AND the notification count
      if (onSuccess) onSuccess();

    } catch (error) {
      setUploadStatus('error');

      const data = error.response?.data;

      if (data?.errors && data.errors.length > 0) {
        // Server returned row-level validation errors
        setErrorMessage(data.message);
        setErrorList(data.errors);
      } else {
        // Server returned a single error message
        setErrorMessage(data?.message || 'Upload failed. Please try again.');
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadStatus(null);
    setErrorMessage('');
    setErrorList([]);
    setSuccessSummary(null);
  };

  const handleClose = () => {
    handleRemoveFile();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">IMPORT STUDENTS</h2>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Directions */}
          <div className="import-directions">
            <h3>Directions:</h3>
            <ol className="directions-list">
              <li>Upload only .csv and .xlsx file</li>
              <li>These are the required columns:
                <ul className="required-columns">
                  {requiredColumns.map((col, i) => <li key={i}>{col}</li>)}
                </ul>
              </li>
              <li>Student ID format: <strong>YY-NNNNN</strong> (e.g. 24-00001)</li>
            </ol>
          </div>

          {/* Upload Area */}
          <div
            className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploadStatus === 'error' ? 'upload-error' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="file-input"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              hidden
            />

            {!file ? (
              <label htmlFor="file-upload" className="upload-label">
                <div className="upload-icon"><IoCloudUploadOutline size={48} /></div>
                <div className="upload-text">
                  <span className="upload-main">Click to upload</span>
                  <span className="upload-sub">or drag and drop</span>
                </div>
                <div className="file-types">.csv or .xlsx (max 5MB)</div>
              </label>
            ) : (
              <div className="file-preview">
                <div className="file-info">
                  <IoDocumentTextOutline size={28} className="file-icon" />
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(2)} KB</span>
                  </div>
                  {uploadStatus === 'success' && <IoCheckmarkCircleOutline size={22} className="success-icon" />}
                  {uploadStatus === 'error'   && <IoAlertCircleOutline    size={22} className="error-icon" />}
                </div>
                <button className="remove-file-btn" onClick={handleRemoveFile}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Single error message */}
          {errorMessage && (
            <div className="error-message">
              <IoAlertCircleOutline size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row-level error list from backend validation */}
          {errorList.length > 0 && (
            <div className="error-list-container">
              <p className="error-list-title">Please fix the following errors in your file:</p>
              <ul className="error-list">
                {errorList.map((err, i) => (
                  <li key={i} className="error-list-item">
                    <IoAlertCircleOutline size={14} />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success summary after upload */}
          {successSummary && (
            <div className="success-summary">
              <IoCheckmarkCircleOutline size={20} className="success-icon" />
              <div>
                <p className="success-main">{successSummary.message}</p>
                {successSummary.failed > 0 && (
                  <p className="success-sub">
                    ⚠️ {successSummary.failed} row(s) failed to insert due to database errors.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Required Columns Preview */}
          <div className="columns-preview">
            <h4>Required Format:</h4>
            <div className="preview-table">
              <div className="preview-header">
                {requiredColumns.map((col, i) => (
                  <span key={i} className="preview-cell">{col}</span>
                ))}
              </div>
              <div className="preview-row">
                <span className="preview-cell">24-00001</span>
                <span className="preview-cell">Juan</span>
                <span className="preview-cell">Dela</span>
                <span className="preview-cell">Cruz</span>
                <span className="preview-cell">College of Computer Studies</span>
                <span className="preview-cell">3rd Year</span>
                <span className="preview-cell">Regular</span>
              </div>
            </div>
          </div>

        </div>

        {/* Actions - Footer */}
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-save"
            onClick={handleUpload}
            disabled={!file || uploadStatus === 'error' || uploadStatus === 'uploading' || uploadStatus === 'done'}
          >
            {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImportStudents;