import React, { useState, useRef, useEffect } from 'react';
import axios from "axios";
import Swal from 'sweetalert2';
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
  MdClose as MdDeleteIcon
} from "react-icons/md";
import RegisterStudentCam from './RegisterStudentCam';

function RegisterStudent({ onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState(Array(5).fill(null));
  const [captureStep, setCaptureStep] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [emailId, setEmailId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [college, setCollege] = useState("");
  const [program, setProgram] = useState("");
  const [extension, setExtension] = useState("");
  const [status, setStatus] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const maxPhotos = 5;

  const emailIdRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const middleNameRef = useRef(null);
  const extensionRef = useRef(null);
  const studentIdRef = useRef(null);
  const collegeRef = useRef(null);
  const programRef = useRef(null);
  const yearLevelRef = useRef(null);
  const statusRef = useRef(null);

  // Tracks which required fields have failed validation
  const [formErrors, setFormErrors] = useState({
    studentId:  "",
    emailId:    "",
    lastName:   "",
    firstName:  "",
    college:    "",
    program:    "",
    yearLevel:  "",
    status:     "",
  });

  const captureSteps = [
    { text: "Face in Center", instruction: "Look straight at the camera", icon: "center" },
    { text: "Face in Left", instruction: "Turn your face slightly to the left", icon: "left" },
    { text: "Face in Right", instruction: "Turn your face slightly to the right", icon: "right" },
    { text: "Face in Up", instruction: "Tilt your face upward", icon: "up" },
    { text: "Face in Down", instruction: "Tilt your face downward", icon: "down" }
  ];

  // Fetch departments and programs from backend
  useEffect(() => {
  const fetchData = async () => {
    setLoadingDepartments(true);
    try {
      // Fetch active departments using status filter
      const deptResponse = await fetch('http://localhost:5000/api/departments?status=Active');
      if (!deptResponse.ok) throw new Error(`HTTP ${deptResponse.status}`);
      const deptData = await deptResponse.json();
      console.log('Departments response:', deptData);
      
      let departmentNames = [];
      if (Array.isArray(deptData)) {
        departmentNames = deptData.map(item => item.dept_name).filter(Boolean);
      }
      setDepartments(departmentNames);
      
      // Fetch active programs
      const progResponse = await fetch('http://localhost:5000/api/programs?programStatus=Active');
      if (!progResponse.ok) throw new Error(`HTTP ${progResponse.status}`);
      const progData = await progResponse.json();
      console.log('Programs response:', progData);
      setPrograms(Array.isArray(progData) ? progData : []);
      
    } catch (error) {
      console.error('Fetch error:', error);
      Swal.fire({
        title: "Connection Error",
        text: "Failed to connect to server. Please check if the backend is running.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "swal-popup",
          confirmButton: "swal-btn-primary",
        },
        buttonsStyling: false,
      });
    } finally {
      setLoadingDepartments(false);
    }
  };
  fetchData();
}, []);

  // Filter programs when department changes
  useEffect(() => {
    if (college) {
      const filtered = programs.filter(prog => {
        const progDept = typeof prog === 'object' ? prog.department : null;
        return progDept === college;
      });
      setFilteredPrograms(filtered);
      setProgram('');
      setFormErrors(prev => ({ ...prev, program: "" }));
    } else {
      setFilteredPrograms([]);
      setProgram('');
    }
  }, [college, programs]);

  // Auto-generate email
  useEffect(() => {
    if (emailManuallyEdited) return;

    const cleanLast = lastName.trim().toLowerCase().replace(/\s+/g, "");
    const cleanFirst = firstName.trim().toLowerCase().replace(/\s+/g, "");

    if (!cleanLast) {
      setEmailId("");
      return;
    }

    const generated = cleanFirst
      ? `${cleanLast}_${cleanFirst}@plpasig.edu.ph`
      : `${cleanLast}@plpasig.edu.ph`;

    setEmailId(generated);
    setFormErrors(prev => ({ ...prev, emailId: "" }));
  }, [firstName, lastName, emailManuallyEdited]);

  // Handle Enter key to move focus to next field
  const handleEnter = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  };

  // Format student ID input as "YY-XXXXX"
  const handleStudentIdChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    let formatted = digits;

    if (digits.length >= 2) {
      const year = digits.slice(0, 2);
      const number = digits.slice(2, 7);
      formatted = number.length > 0 ? `${year}-${number}` : year;
    }

    setStudentId(formatted);
    setFormErrors(prev => ({ ...prev, studentId: "" }));
  };

  // Step 1 validation
  const validateStep1 = () => {
    const plpasigRegex = /^[a-zA-Z0-9._%+-]+@plpasig\.edu\.ph$/i;
    const errors = {
      studentId: !studentId.toString().trim()
        ? "Student ID is required"
        : !/^\d{2}-(?!00000)\d{5}$/.test(studentId.trim())
        ? "Format must be YY-NNNNN (e.g. 23-00290), number 00001–99999"
        : "",
      lastName: !lastName.trim() ? "Last Name is required" : "",
      firstName: !firstName.trim() ? "First Name is required" : "",
      college: !college ? "College Department is required" : "",
      program: !program ? "Program is required" : "",
      yearLevel: !yearLevel.toString().trim() ? "Year Level is required" : "",
      status: !status ? "Status is required" : "",
      emailId: !emailId.trim()
        ? "Email is required"
        : !plpasigRegex.test(emailId.trim())
        ? "Must be a valid @plpasig.edu.ph email"
        : "",
    };
    setFormErrors(errors);
    return Object.values(errors).every(e => e === "");
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => setCurrentStep(1);

  // Cancel / Close with confirmation
  const handleClose = () => {
    Swal.fire({
      title: "Cancel Registration?",
      text: "All entered information will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel",
      cancelButtonText: "Keep editing",
      customClass: {
        popup: "swal-popup",
        title: "swal-title",
        htmlContainer: "swal-text",
        confirmButton: "swal-btn-confirm",
        cancelButton: "swal-btn-cancel",
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) onClose();
    });
  };

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
    setScanComplete(false);
    setScanError(false);
  };

  const handleScan = async () => {
    try {
      setIsScanning(true);
      setScanError(false);

      const validImages = photoPreviews.filter(img => img !== null);

      if (validImages.length !== 5) {
        setScanError(true);
        Swal.fire({
          title: "Incomplete Photos",
          text: "Please capture all 5 photos before scanning.",
          icon: "warning",
          confirmButtonText: "OK",
          customClass: {
            popup: "swal-popup",
            confirmButton: "swal-btn-primary",
          },
          buttonsStyling: false,
        });
        setIsScanning(false);
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/validate-face",
        { images: validImages }
      );

      console.log("Validation result:", response.data);

      if (response.data.success) {
        setScanComplete(true);
        Swal.fire({
          title: "Success!",
          text: "All photos have been verified successfully.",
          icon: "success",
          confirmButtonText: "OK",
          customClass: {
            popup: "swal-popup",
            confirmButton: "swal-btn-primary",
          },
          buttonsStyling: false,
        });
      } else {
        setScanError(true);
        Swal.fire({
          title: "Validation Failed",
          text: response.data.message || "Face validation failed. Please retake the photos.",
          icon: "error",
          confirmButtonText: "Try Again",
          customClass: {
            popup: "swal-popup",
            confirmButton: "swal-btn-primary",
          },
          buttonsStyling: false,
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      setScanError(true);
      Swal.fire({
        title: "Error",
        text: error.response?.data?.error || "Face validation failed. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "swal-popup",
          confirmButton: "swal-btn-primary",
        },
        buttonsStyling: false,
      });
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
            <MdFace className="direction-face-icon" />
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

  const handleRegister = async () => {
    if (!scanComplete) {
      Swal.fire({
        title: "Photos Not Verified",
        text: "Please scan and verify all photos before registering.",
        icon: "warning",
        confirmButtonText: "OK",
        customClass: {
          popup: "swal-popup",
          confirmButton: "swal-btn-primary",
        },
        buttonsStyling: false,
      });
      return;
    }

    try {
      const validImages = photoPreviews.filter(img => img !== null);

      const response = await axios.post(
        "http://localhost:5000/api/register",
        {
          student_id: studentId,
          email: emailId.trim().toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          extension_name: extension,
          college_department: college,
          program: program,
          year_level: parseInt(yearLevel),
          status: status,
          images: validImages
        }
      );

      console.log(response.data);

      await Swal.fire({
        title: "Student Registered!",
        html: `<p><strong>${firstName} ${lastName}</strong> has been successfully registered in the system.</p>`,
        icon: "success",
        confirmButtonText: "Done",
        customClass: {
          popup: "swal-popup",
          title: "swal-title",
          htmlContainer: "swal-text",
          confirmButton: "swal-btn-primary",
        },
        buttonsStyling: false,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Registration error:", error);
      Swal.fire({
        title: "Registration Failed",
        text: error.response?.data?.message || "Something went wrong. Please try again.",
        icon: "error",
        confirmButtonText: "Try Again",
        customClass: {
          popup: "swal-popup",
          title: "swal-title",
          htmlContainer: "swal-text",
          confirmButton: "swal-btn-primary",
        },
        buttonsStyling: false,
      });
    }
  };

  return (
    <div className="register-container">
      <div className="register-header">
        <div className="register-text">REGISTER STUDENT</div>
        <div className="register-close">
          <i className='register-close-btn' onClick={handleClose}>
            <MdClose />
          </i>
        </div>
      </div>

      {/* TWO-STEP PROGRESS STEPPER */}
      <div className="register-stepper">
        <div className={`stepper-step ${currentStep === 1 ? 'step-active' : 'step-done'}`}>
          <div className="step-circle">
            {currentStep > 1 ? <MdCheckCircle className="step-check-icon" /> : <span>1</span>}
          </div>
          <div className="step-label">
            <span className="step-title">Step 1</span>
            <span className="step-subtitle">Student Information</span>
          </div>
        </div>

        <div className={`stepper-line ${currentStep === 2 ? 'line-filled' : ''}`} />

        <div className={`stepper-step ${currentStep === 2 ? 'step-active' : 'step-pending'}`}>
          <div className="step-circle"><span>2</span></div>
          <div className="step-label">
            <span className="step-title">Step 2</span>
            <span className="step-subtitle">Face Registration</span>
          </div>
        </div>
      </div>

      {currentStep === 1 ? (
        <div className="register-form">
          <div className="form-note">* Required fields</div>
          
          <div className="form-row">
            <div className="input-group">
              <label>Last Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. Dela Cruz"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setEmailManuallyEdited(false);
                  setFormErrors(prev => ({...prev, lastName: ""}));
                }}
                className={formErrors.lastName ? "input-error" : ""}
                style={{ textTransform: 'uppercase' }}
                ref={lastNameRef}
                onKeyDown={(e) => handleEnter(e, middleNameRef)}
                required
              />
              {formErrors.lastName && <span className="field-error">{formErrors.lastName}</span>}
            </div>
            
            <div className="input-group">
              <label>Student ID <span className="required">*</span></label>
              <input
                type="text"
                maxLength={8}
                placeholder="e.g 23-00290"
                value={studentId}
                onChange={handleStudentIdChange}
                className={formErrors.studentId ? "input-error" : ""}
                ref={studentIdRef}
                onKeyDown={(e) => handleEnter(e, collegeRef)}
                required
              />
              {formErrors.studentId && <span className="field-error">{formErrors.studentId}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>First Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g Juan"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setEmailManuallyEdited(false);
                  setFormErrors(prev => ({...prev, firstName: ""}));
                }}
                className={formErrors.firstName ? "input-error" : ""}
                style={{ textTransform: 'uppercase' }}
                ref={firstNameRef}
                onKeyDown={(e) => handleEnter(e, lastNameRef)}
                required
              />
              {formErrors.firstName && <span className="field-error">{formErrors.firstName}</span>}
            </div>
            
            <div className="input-group">
              <label>College Department <span className="required">*</span></label>
              <select
                value={college}
                onChange={(e) => { 
                  setCollege(e.target.value); 
                  setFormErrors(prev => ({...prev, college: ""}));
                }}
                className={formErrors.college ? "input-error" : ""}
                ref={collegeRef}
                onKeyDown={(e) => handleEnter(e, programRef)}
                required
                disabled={loadingDepartments}
              >
                <option value="">
                  {loadingDepartments ? "Loading departments..." : "Select College Department"}
                </option>
                {departments.map((dept, index) => (
                  <option key={index} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {formErrors.college && <span className="field-error">{formErrors.college}</span>}
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
                style={{ textTransform: 'uppercase' }}
                ref={middleNameRef}
                onKeyDown={(e) => handleEnter(e, extensionRef)}
              />
            </div>
            
            <div className="input-group">
              <label>Program <span className="required">*</span></label>
              <select
                value={program}
                onChange={(e) => { 
                  setProgram(e.target.value); 
                  setFormErrors(prev => ({...prev, program: ""}));
                }}
                className={formErrors.program ? "input-error" : ""}
                ref={programRef}
                onKeyDown={(e) => handleEnter(e, yearLevelRef)}
                disabled={!college}
                required
              >
                <option value="">{college ? "Select Program" : "Select Department First"}</option>
                {filteredPrograms.map((prog, index) => (
                  <option key={index} value={prog.programName || prog.name || prog}>
                    {prog.programName || prog.name || prog} {prog.programCode ? `(${prog.programCode})` : ''}
                  </option>
                ))}
              </select>
              {formErrors.program && <span className="field-error">{formErrors.program}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Extension Name</label>
              <select 
                value={extension} 
                onChange={(e) => setExtension(e.target.value)} 
                ref={extensionRef} 
                onKeyDown={(e) => handleEnter(e, studentIdRef)}
              >
                <option value="">Select Extension Name</option>
                <option value="Jr.">Jr.</option>
                <option value="Sr.">Sr.</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>
            
            <div className="input-group">
              <label>Year Level <span className="required">*</span></label>
              <input
                type="number"
                placeholder="e.g 3"
                value={yearLevel}
                onChange={(e) => { 
                  setYearLevel(e.target.value); 
                  setFormErrors(prev => ({...prev, yearLevel: ""}));
                }}
                className={formErrors.yearLevel ? "input-error" : ""}
                min="1"
                max="5"
                ref={yearLevelRef}
                onKeyDown={(e) => handleEnter(e, statusRef)}
                required
              />
              {formErrors.yearLevel && <span className="field-error">{formErrors.yearLevel}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                placeholder="e.g delacruz_juan@plpasig.edu.ph"
                value={emailId}
                onChange={(e) => {
                  setEmailId(e.target.value);
                  setEmailManuallyEdited(true);
                  setFormErrors(prev => ({...prev, emailId: ""}));
                }}
                className={formErrors.emailId ? "input-error" : ""}
                ref={emailIdRef}
                onKeyDown={(e) => handleEnter(e, studentIdRef)}
                required
              />
              {formErrors.emailId && <span className="field-error">{formErrors.emailId}</span>}
            </div>
            
            <div className="input-group">
              <label>Status <span className="required">*</span></label>
              <select
                value={status}
                onChange={(e) => { 
                  setStatus(e.target.value); 
                  setFormErrors(prev => ({...prev, status: ""}));
                }}
                className={formErrors.status ? "input-error" : ""}
                ref={statusRef}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                required
              >
                <option value="">Select Status</option>
                <option value="Regular">Regular</option>
                <option value="Irregular">Irregular</option>
              </select>
              {formErrors.status && <span className="field-error">{formErrors.status}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn cancel" onClick={handleClose}>Cancel</button>
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

          {scanError && !isScanning && (
            <div className="scan-error">
              <MdError className="error-icon" />
              <span>Scan failed. Please ensure all 5 photos are captured and try again.</span>
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
            disabled={isScanning || uploadedPhotos !== maxPhotos}
          >
            <MdCameraAlt className="scan-icon" />
            {isScanning ? "Scanning..." : "Scan and Verify"}
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