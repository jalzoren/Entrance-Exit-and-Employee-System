// components/EditStudent.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
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
  MdClose as MdDeleteIcon,
} from "react-icons/md";
import RegisterStudentCam from "./RegisterStudentCam";
import "../componentscss/EditStudent.css";

const CAPTURE_STEPS = [
  { text: "Face in Center", instruction: "Look straight at the camera", icon: "center" },
  { text: "Face in Left",   instruction: "Turn your face slightly to the left", icon: "left" },
  { text: "Face in Right",  instruction: "Turn your face slightly to the right", icon: "right" },
  { text: "Face in Up",     instruction: "Tilt your face upward", icon: "up" },
  { text: "Face in Down",   instruction: "Tilt your face downward", icon: "down" },
];

const MAX_PHOTOS = 5;
const EXTENSION_OPTIONS = ["", "Jr.", "Sr.", "I", "II", "III", "IV"];

function DirectionIcon({ step }) {
  switch (step) {
    case 0: return <div className="face-icon-center" />;
    case 1: return <div className="direction-wrapper"><MdArrowBack className="direction-icon left" /><MdOutlineFace className="direction-face-icon" /></div>;
    case 2: return <div className="direction-wrapper"><MdArrowForward className="direction-icon right" /><MdOutlineFace className="direction-face-icon" /></div>;
    case 3: return <div className="direction-wrapper"><MdArrowUpward className="direction-icon up" /><MdOutlineFace className="direction-face-icon" /></div>;
    case 4: return <div className="direction-wrapper"><MdArrowDownward className="direction-icon down" /><MdOutlineFace className="direction-face-icon" /></div>;
    default: return <MdFace />;
  }
}

function EditStudent({ student, onClose }) {
  const [activeTab, setActiveTab] = useState("info");

  // Student info fields
  const [email, setEmail] = useState(student.email || "");
  const [firstName, setFirstName] = useState(student.first_name || "");
  const [lastName, setLastName] = useState(student.last_name || "");
  const [middleName, setMiddleName] = useState(student.middle_name || "");
  const [extension, setExtension] = useState(student.extension_name || "");
  const [college, setCollege] = useState(student.college_department || "");
  const [program, setProgram] = useState(student.program_name || "");
  const [yearLevel, setYearLevel] = useState(student.year_level || "");
  const [status, setStatus] = useState(student.status || "");
  const [formErrors, setFormErrors] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  // Departments and programs
  const [activeDepartments, setActiveDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);

  // Face capture
  const [photoPreviews, setPhotoPreviews] = useState(Array(MAX_PHOTOS).fill(null));
  const [captureStep, setCaptureStep] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState(false);

  const uploadedPhotos = photoPreviews.filter(Boolean).length;
  const progressPercent = (uploadedPhotos / MAX_PHOTOS) * 100;

  // Fetch active departments
  useEffect(() => {
    const fetchActiveDepartments = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/departments?status=Active');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setActiveDepartments(data);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setActiveDepartments([]);
      }
    };
    fetchActiveDepartments();
  }, []);

  // Fetch all active programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/programs?programStatus=Active');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setPrograms(data);
      } catch (error) {
        console.error('Error fetching programs:', error);
      }
    };
    fetchPrograms();
  }, []);

  // Filter programs when college changes
  useEffect(() => {
    if (college) {
      const filtered = programs.filter(prog => prog.department === college);
      setFilteredPrograms(filtered);
      // If current program not in filtered list, clear it
      if (program && !filtered.some(p => p.programName === program)) {
        setProgram('');
      }
    } else {
      setFilteredPrograms([]);
    }
  }, [college, programs]);

  // Validation (including program)
  const validateInfo = () => {
    const errors = {
      lastName: !lastName.trim() ? "Last Name is required" : "",
      firstName: !firstName.trim() ? "First Name is required" : "",
      college: !college ? "College Department is required" : "",
      program: !program ? "Program is required" : "",
      yearLevel: !yearLevel ? "Year Level is required" : "",
      status: !status ? "Status is required" : "",
    };
    setFormErrors(errors);
    return Object.values(errors).every(e => e === "");
  };

  // Save student info
  const handleSaveInfo = async () => {
    if (!validateInfo()) return;

    try {
      setSavingInfo(true);

      await axios.put(
        `http://localhost:5000/api/students/${student.student_id}`,
        {
          first_name: firstName.trim().toUpperCase(),
          last_name: lastName.trim().toUpperCase(),
          middle_name: middleName.trim().toUpperCase(),
          extension_name: extension,
          college_department: college,
          program_name: program,
          year_level: yearLevel,
          status,
        }
      );

      await Swal.fire({
        title: "Student Updated",
        html: `<p><strong>${firstName} ${lastName}</strong> has been updated successfully.</p>`,
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

      onClose();
    } catch (err) {
      console.error("Update error:", err);
      Swal.fire({
        title: "Update Failed",
        text: err.response?.data?.message || "Something went wrong. Please try again.",
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
    } finally {
      setSavingInfo(false);
    }
  };

  // Face capture handlers
  const openCamera = () => {
    setCaptureStep(0);
    setShowCamera(true);
  };

  const handleCapture = (photoDataUrl) => {
    const updated = [...photoPreviews];
    updated[captureStep] = photoDataUrl;
    setPhotoPreviews(updated);
    if (captureStep < MAX_PHOTOS - 1) {
      setCaptureStep(captureStep + 1);
    } else {
      setShowCamera(false);
    }
  };

  const handleDeletePhoto = (index) => {
    const updated = [...photoPreviews];
    updated[index] = null;
    setPhotoPreviews(updated);
    if (scanComplete) setScanComplete(false);
  };

  const handleScan = async () => {
    const validImages = photoPreviews.filter(Boolean);
    if (validImages.length !== MAX_PHOTOS) {
      setScanError(true);
      return;
    }

    try {
      setIsScanning(true);
      setScanError(false);
      await axios.post("http://localhost:5000/api/validate-face", { images: validImages });
      setScanComplete(true);
    } catch (err) {
      console.error(err);
      setScanError(true);
      alert(err.response?.data?.error || "Face validation failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRegisterFace = async () => {
    try {
      const validImages = photoPreviews.filter(Boolean);
      await axios.post("http://localhost:5000/api/register-face", {
        student_id: student.student_id,
        images: validImages,
      });
      await Swal.fire({
        title: "Face Registered!",
        html: `<p><strong>${student.first_name} ${student.last_name}</strong>'s face has been successfully registered.</p>`,
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
      onClose();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Face Registration Failed",
        text: err.response?.data?.message || "Something went wrong. Please try again.",
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

  const handleClose = () => {
    Swal.fire({
      title: "Discard Changes?",
      text: "Any unsaved changes will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, discard",
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

  return (
    <div className="edit-modal-overlay">
      <div className="edit-modal-content">
        <div className="edit-modal-header">
          <div>
            <h2 className="edit-modal-title">Edit Student</h2>
            <p className="edit-modal-subtitle">
              {student.student_id} — {student.first_name} {student.last_name}
            </p>
          </div>
          <button className="edit-close-btn" onClick={handleClose}>
            <MdClose />
          </button>
        </div>

        <div className="edit-tabs">
          {!student.hasFace && (
            <button
              type="button"
              className={`edit-tab edit-tab-face ${activeTab === "face" ? "edit-tab-active" : ""}`}
              onClick={() => setActiveTab("face")}
            >
              <span className="face-tab-dot" />
              Register Face
            </button>
          )}
        </div>

        {activeTab === "info" && (
          <div className="edit-form">
            <div className="form-note">* Required fields</div>

            <div className="form-row">
              <div className="input-group">
                <label>Last Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setFormErrors(p => ({ ...p, lastName: "" })); }}
                  className={formErrors.lastName ? "input-error" : ""}
                  style={{ textTransform: "uppercase" }}
                />
                {formErrors.lastName && <span className="field-error">{formErrors.lastName}</span>}
              </div>

              <div className="input-group">
                <label>First Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setFormErrors(p => ({ ...p, firstName: "" })); }}
                  className={formErrors.firstName ? "input-error" : ""}
                  style={{ textTransform: "uppercase" }}
                />
                {formErrors.firstName && <span className="field-error">{formErrors.firstName}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  style={{ textTransform: "uppercase" }}
                />
              </div>

              <div className="input-group">
                <label>Extension Name</label>
                <select value={extension} onChange={(e) => setExtension(e.target.value)}>
                  {EXTENSION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt || "None"}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>College Department <span className="required">*</span></label>
                <select
                  value={college}
                  onChange={(e) => { setCollege(e.target.value); setFormErrors(p => ({ ...p, college: "" })); }}
                  className={formErrors.college ? "input-error" : ""}
                >
                  <option value="">Select College Department</option>
                  {activeDepartments.map((dept) => (
                    <option key={dept.id} value={dept.dept_name}>
                      {dept.dept_name}
                    </option>
                  ))}
                </select>
                {formErrors.college && <span className="field-error">{formErrors.college}</span>}
              </div>

              <div className="input-group">
                <label>Program <span className="required">*</span></label>
                <select
                  value={program}
                  onChange={(e) => { setProgram(e.target.value); setFormErrors(p => ({ ...p, program: "" })); }}
                  className={formErrors.program ? "input-error" : ""}
                  disabled={!college}
                  required
                >
                  <option value="">{college ? "Select Program" : "Select Department First"}</option>
                  {filteredPrograms.map((prog) => (
                    <option key={prog.id} value={prog.programName}>
                      {prog.programName} ({prog.programCode})
                    </option>
                  ))}
                </select>
                {formErrors.program && <span className="field-error">{formErrors.program}</span>}
              </div>

              <div className="input-group">
                <label>Year Level <span className="required">*</span></label>
                <select
                  value={yearLevel}
                  onChange={(e) => { setYearLevel(e.target.value); setFormErrors(p => ({ ...p, yearLevel: "" })); }}
                  className={formErrors.yearLevel ? "input-error" : ""}
                >
                  <option value="">Select Year Level</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                {formErrors.yearLevel && <span className="field-error">{formErrors.yearLevel}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Status <span className="required">*</span></label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setFormErrors(p => ({ ...p, status: "" })); }}
                  className={formErrors.status ? "input-error" : ""}
                >
                  <option value="">Select Status</option>
                  <option value="Regular">Regular</option>
                  <option value="Irregular">Irregular</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {formErrors.status && <span className="field-error">{formErrors.status}</span>}
              </div>

              <div className="input-group">
                <label>Student ID</label>
                <input type="text" value={student.student_id} disabled className="input-disabled" style={{ opacity: 0.6 }} />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="text" value={email} disabled className="input-disabled" style={{ opacity: 0.6 }} />
              </div>
            </div>

            <div className="edit-form-actions">
              <button type="button" className="btn cancel" onClick={handleClose}>Cancel</button>
              <button type="button" className="btn save" onClick={handleSaveInfo} disabled={savingInfo}>
                {savingInfo ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "face" && !student.hasFace && (
          <div className="photo-upload-section">
            <div className="photo-header">
              <h3>Capture Face Images</h3>
              <div className="photo-counter">
                <MdCameraAlt className="camera-icon" />
                <span>Captured: {uploadedPhotos}/{MAX_PHOTOS}</span>
              </div>
            </div>

            <div className="photo-boxes-container">
              {[...Array(MAX_PHOTOS)].map((_, index) => (
                <div key={index} className="photo-box-wrapper">
                  <div className="photo-box-container">
                    <div
                      className={`photo-box ${photoPreviews[index] ? "filled" : "empty"}`}
                      onClick={() => !photoPreviews[index] && openCamera()}
                    >
                      {photoPreviews[index] ? (
                        <>
                          <img src={photoPreviews[index]} alt={`Captured ${index + 1}`} className="photo-box-image" />
                          {scanComplete && <div className="photo-check"><MdCheckCircle className="check-icon" /></div>}
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
                        type="button"
                        className="photo-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDeletePhoto(index); }}
                        title="Delete photo"
                      >
                        <MdDeleteIcon />
                      </button>
                    )}
                  </div>
                  <div className="photo-label">{CAPTURE_STEPS[index].text}</div>
                </div>
              ))}
            </div>

            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="progress-text">{Math.round(progressPercent)}%</span>
            </div>

            <RegisterStudentCam
              showCamera={showCamera}
              onClose={() => setShowCamera(false)}
              captureStep={captureStep}
              captureSteps={CAPTURE_STEPS}
              onCapture={handleCapture}
              getDirectionIcon={(step) => <DirectionIcon step={step} />}
            />

            {isScanning && (
              <div className="scanning-status">
                <div className="spinner" />
                <span>Authenticating photos…</span>
              </div>
            )}

            {scanError && (
              <div className="scan-error">
                <MdError className="error-icon" />
                <span>Scan failed. Ensure all {MAX_PHOTOS} photos are captured.</span>
              </div>
            )}

            {scanComplete && (
              <div className="scan-success">
                <MdCheckCircle className="success-icon" />
                <span>Authentication complete — all photos verified.</span>
              </div>
            )}

            <button
              type="button"
              className="scan-button"
              onClick={handleScan}
              disabled={isScanning || uploadedPhotos === 0}
            >
              <MdCameraAlt className="scan-icon" />
              Scan and Verify
            </button>

            <div className="edit-form-actions">
              <button type="button" className="btn cancel" onClick={handleClose}>Cancel</button>
              <button
                type="button"
                className="btn register"
                disabled={!scanComplete}
                onClick={handleRegisterFace}
              >
                Register Face
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditStudent;