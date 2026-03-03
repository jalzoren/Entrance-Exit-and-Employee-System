import React, { useState } from 'react';
import { IoClose, IoCloudUploadOutline, IoAlertCircleOutline, IoCheckmarkCircleOutline, IoDocumentTextOutline } from 'react-icons/io5';
import '../componentscss/ImportStudents.css';

const ImportStudents = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState('');

  const requiredColumns = [
    'Student ID',
    'Full Name',
    'College Department',
    'Year Level',
    'Enrollment Status'
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (file) => {
    setUploadStatus(null);
    setErrorMessage('');

    if (!file) return;

    // Check file extension
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'xlsx') {
      setUploadStatus('error');
      setErrorMessage('Please upload only .csv or .xlsx files');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus('error');
      setErrorMessage('File size should not exceed 5MB');
      return;
    }

    setFile(file);
    setUploadStatus('success');
  };

  const handleUpload = () => {
    if (!file) return;

    // Here you would implement the actual upload logic
    console.log('Uploading file:', file);
    
    // Simulate upload success
    setTimeout(() => {
      alert('File uploaded successfully!');
      onClose();
    }, 1000);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadStatus(null);
    setErrorMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="import-overlay">
      <div className="import-container">
        {/* Header */}
        <div className="import-header">
          <h2 className="import-title">IMPORT</h2>
          <button className="import-close-btn" onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="import-content">
          {/* Directions */}
          <div className="import-directions">
            <h3>Directions:</h3>
            <ol className="directions-list">
              <li>Upload only .csv and .xlsx file</li>
              <li>These are the required columns</li>
              <ul className="required-columns">
                {requiredColumns.map((column, index) => (
                  <li key={index}>{column}</li>
                ))}
              </ul>
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
                <div className="upload-icon">
                  <IoCloudUploadOutline size={48} />
                </div>
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
                    <span className="file-size">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  {uploadStatus === 'success' && (
                    <IoCheckmarkCircleOutline size={22} className="success-icon" />
                  )}
                  {uploadStatus === 'error' && (
                    <IoAlertCircleOutline size={22} className="error-icon" />
                  )}
                </div>
                <button className="remove-file-btn" onClick={handleRemoveFile}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="error-message">
              <IoAlertCircleOutline size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Required Columns Preview */}
          <div className="columns-preview">
            <h4>Required Format:</h4>
            <div className="preview-table">
              <div className="preview-header">
                {requiredColumns.map((col, idx) => (
                  <span key={idx} className="preview-cell">{col}</span>
                ))}
              </div>
              <div className="preview-row">
                <span className="preview-cell">2024-1001</span>
                <span className="preview-cell">Juan Dela Cruz</span>
                <span className="preview-cell">CSS</span>
                <span className="preview-cell">3rd Year</span>
                <span className="preview-cell">Regular</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="import-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-upload" 
              onClick={handleUpload}
              disabled={!file || uploadStatus === 'error'}
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportStudents;