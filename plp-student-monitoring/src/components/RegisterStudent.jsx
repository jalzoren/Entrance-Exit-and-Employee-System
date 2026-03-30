import React, { useState } from 'react';
import axios from "axios";
import '../componentscss/RegisterStudent.css';
import { 
  MdClose, 
  MdCameraAlt, 
  MdCheckCircle, 
  MdError, 
  MdPhotoCamera, 
  MdArrowUpward, 
  MdArrowDownward, 
  MdArrowBack, 
  MdArrowForward,
  MdFace,
  MdOutlineFace,
  MdFlipCameraIos,
  MdClose as MdDeleteIcon
} from "react-icons/md";
import RegisterStudentCam from './RegisterStudentCam';

function RegisterStudent({ onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState(Array(5).fill(null));
  const [captureStep, setCaptureStep] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const maxPhotos = 5;

  const captureSteps = [
    { text: "Face in Center", instruction: "Look straight at the camera", icon: "center" },
    { text: "Face in Left", instruction: "Turn your face slightly to the left", icon: "left" },
    { text: "Face in Right", instruction: "Turn your face slightly to the right", icon: "right" },
    { text: "Face in Up", instruction: "Tilt your face upward", icon: "up" },
    { text: "Face in Down", instruction: "Tilt your face downward", icon: "down" }
  ];

  const handleNext = () => setCurrentStep(2);
  const handlePrevious = () => setCurrentStep(1);

  const openCamera = () => {
    setCaptureStep(0);
    setShowCamera(true);
  };

  const handleCapture = (photoDataUrl) => {
    const newPreviews = [...photoPreviews];
    newPreviews[captureStep] = photoDataUrl;
    setPhotoPreviews(newPreviews);
    
    const newCount = newPreviews.filter(photo => photo !== null).length;
    setUploadedPhotos(newCount);
    
    if (captureStep < maxPhotos - 1) {
      setCaptureStep(captureStep + 1);
    } else {
      setShowCamera(false);
    }
  };

  const handleDeletePhoto = (index) => {
    const newPreviews = [...photoPreviews];
    newPreviews[index] = null;
    setPhotoPreviews(newPreviews);
    
    const newCount = newPreviews.filter(photo => photo !== null).length;
    setUploadedPhotos(newCount);
    
    if (scanComplete) setScanComplete(false);
  };

  const handleScan = async () => {
    try {
  
      setIsScanning(true);
      setScanError(false);
  
      const validImages = photoPreviews.filter(img => img !== null);
  
      if (validImages.length !== 5) {
        setScanError(true);
        setIsScanning(false);
        return;
      }
  
      const response = await axios.post(
        "http://localhost:5000/api/validate-face",
        { images: validImages }
      );
  
      console.log("Validation result:", response.data);
  
      setScanComplete(true);
  
    } catch (error) {
  
      console.error(error);
  
      alert(
        error.response?.data?.error ||
        "Face validation failed"
      );
  
      setScanError(true);
  
    } finally {
      setIsScanning(false);
    }
  };

  const progressPercentage = (uploadedPhotos / maxPhotos) * 100;

  const getDirectionIcon = (step) => {
    switch(step) {
      case 0: 
        return (
          <div className="face-icon-center">
          </div>
        );
      case 1: 
        return (
          <div className="direction-wrapper">
            <MdArrowBack className="direction-icon left" />
            <MdOutlineFace className="direction-face-icon" />
          </div>
        );
      case 2: 
        return (
          <div className="direction-wrapper">
            <MdArrowForward className="direction-icon right" />
            <MdOutlineFace className="direction-face-icon" />
          </div>
        );
      case 3: 
        return (
          <div className="direction-wrapper">
            <MdArrowUpward className="direction-icon up" />
            <MdOutlineFace className="direction-face-icon" />
          </div>
        );
      case 4: 
        return (
          <div className="direction-wrapper">
            <MdArrowDownward className="direction-icon down" />
            <MdOutlineFace className="direction-face-icon" />
          </div>
        );
      default: return <MdFace />;
    }
  };

  const [status, setStatus] = useState("");
  const [college, setCollege] = useState("");

  const handleRegister = async () => {
    try {
  
      const validImages = photoPreviews.filter(img => img !== null);
  
      const response = await axios.post(
        "http://localhost:5000/api/register",
        {
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          college_department: college,
          year_level: yearLevel,
          status: status,
          images: validImages
        }
      );
  
      alert("Student registered successfully");
  
      console.log(response.data);
  
      onClose();
  
    } catch (error) {
  
      console.error(error);
  
      alert(
        error.response?.data?.message ||
        "Registration failed"
      );
  
    }
  };

  return (
    <div className="register-container">
      <div className="register-header">
        <div className="register-text">REGISTER STUDENT</div>
        <div className="register-close">
          <i className='register-close-btn' onClick={onClose}>
            <MdClose />
          </i>
        </div>
      </div>

      {currentStep === 1 ? (
        <div className="register-form">
          <div className="form-row">
            <div className="input-group">
              <label>Student ID</label>
              <input
                type="number"
                placeholder="e.g 2300001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>College Department</label>
              <select value={college} onChange={(e) => setCollege(e.target.value)}>
                <option value="">Select College Department</option>
                <option value="College of Nursing">College of Nursing</option>
                <option value="College of Engineering">College of Engineering</option>
                <option value="College of Education">College of Education</option>
                <option value="College of Computer Studies">College of Computer Studies</option>
                <option value="College of Arts and Science">College of Arts and Science</option>
                <option value="College of Business and Accountancy">
                  College of Business and Accountancy
                </option>
                <option value="College of Hospitality Management">
                  College of Hospitality Management
                </option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="e.g. Dela Cruz"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Year Level</label>
              <input
                type="number"
                placeholder="e.g 3rd"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>First Name</label>
              <input
                type="text"
                placeholder="e.g Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Select Status</option>
                <option value="Regular">Regular</option>
                <option value="Irregular">Irregular</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Middle Name</label>
              <input
                type="text"
                placeholder="e.g Smith"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>
            <div className="input-group" />
          </div>

          <div className="form-actions">
            <button className="btn cancel" onClick={onClose}>Cancel</button>
            <button className="btn next" onClick={handleNext}>Next</button>
          </div>
        </div>
      ) : (
        <div className="photo-upload-section">
          <div className="photo-header">
            <h3>Capture Image</h3>
            <div className="photo-counter">
              <MdCameraAlt className="camera-icon" />
              <span>Registered Image: {uploadedPhotos}/{maxPhotos}</span>
            </div>
          </div>

         

          <div className="photo-boxes-container">
            {[...Array(maxPhotos)].map((_, index) => (
              <div key={index} className="photo-box-wrapper">
                <div className="photo-box-container">
                  <div 
                    className={`photo-box ${photoPreviews[index] ? 'filled' : 'empty'}`}
                    onClick={() => !photoPreviews[index] && openCamera()}
                  >
                    {photoPreviews[index] ? (
                      <>
                        <img 
                          src={photoPreviews[index]} 
                          alt={`Captured ${index + 1}`}
                          className="photo-box-image"
                        />
                        {scanComplete && (
                          <div className="photo-check">
                            <MdCheckCircle className="check-icon" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="photo-placeholder">
                        <MdPhotoCamera className="placeholder-icon" />
                        <span className="placeholder-text">Click to capture</span>
                      </div>
                    )}
                  </div>
                  
                  {photoPreviews[index] && (
                    <button 
                      className="photo-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(index);
                      }}
                      title="Delete photo"
                    >
                      <MdDeleteIcon />
                    </button>
                  )}
                </div>
                <div className="photo-label">{captureSteps[index].text}</div>
              </div>
            ))}
          </div>

          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progressPercentage)}%</span>
          </div>

          <RegisterStudentCam
            showCamera={showCamera}
            onClose={() => setShowCamera(false)}
            captureStep={captureStep}
            captureSteps={captureSteps}
            onCapture={handleCapture}
            getDirectionIcon={getDirectionIcon}
          />

          {isScanning && (
            <div className="scanning-status">
              <div className="spinner"></div>
              <span>Authenticating Photo...</span>
            </div>
          )}

          {scanError && (
            <div className="scan-error">
              <MdError className="error-icon" />
              <span>Scan failed. Please ensure {maxPhotos} photos are captured.</span>
            </div>
          )}

          {scanComplete && (
            <div className="scan-success">
              <MdCheckCircle className="success-icon" />
              <span>Authentication Complete! All photos verified.</span>
            </div>
          )}

          <button 
            className="scan-button"
            onClick={handleScan}
            disabled={isScanning || uploadedPhotos === 0}
          >
            <MdCameraAlt className="scan-icon" />
            Scan and Save
          </button>

          <div className="photo-form-actions">
            <button className="btn previous" onClick={handlePrevious}>
              Previous
            </button>
            <button 
              className="btn register" 
              disabled={!scanComplete}
              onClick={handleRegister}
            >
              Register
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterStudent;