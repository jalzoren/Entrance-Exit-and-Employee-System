import { useRef, useEffect, useState, useCallback } from "react";
import "../css/FaceRecognition.css";
import { Link } from "react-router-dom";
import { useLogContext } from "../context/LogContext";
import { useCameraContext } from "../context/CameraContext";
import Swal from "sweetalert2";
import { FaArrowLeft } from "react-icons/fa";

function FaceRecognition() {
  const videoRef = useRef(null);
  const { addLog, addFailedLog } = useLogContext();
  const { 
    updateCameraFrame, 
    updateCameraStatus, 
    setActiveCameraState, 
    setVideoStream,
    cameraStatus: contextCameraStatus,
    detectedFace: contextDetectedFace
  } = useCameraContext();

  const [isScanning, setIsScanning] = useState(true);
  const [logType, setLogType] = useState("");
  const [showManualIdModal, setShowManualIdModal] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualIdLoading, setManualIdLoading] = useState(false);

  const [localCameraStatus, setLocalCameraStatus] = useState("neutral");
  const [authenticatedName, setAuthenticatedName] = useState("");
  const [department, setDepartment] = useState("");
  const [authTime, setAuthTime] = useState("");
  const [logs, setLogs] = useState([]);

  // Clear input when modal closes
  useEffect(() => {
    if (!showManualIdModal) {
      setManualId("");
      setManualIdLoading(false);
    }
  }, [showManualIdModal]);

  // Sync local camera status with context status
  useEffect(() => {
    setLocalCameraStatus(contextCameraStatus);
  }, [contextCameraStatus]);

  // -----------------------------
  // START CAMERA
  // -----------------------------
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setActiveCameraState(true);
          console.log("✅ Camera STARTED in FaceRecognition");
          
          // CRITICAL: Share the video stream with CameraContext for Monitor
          setVideoStream(stream);
          console.log("✅ Stream shared with CameraContext");
          
          // Start capturing frames for real-time display in Monitor
          const frameInterval = setInterval(() => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoRef.current, 0, 0);
                const frameData = canvas.toDataURL("image/jpeg", 0.7);
                updateCameraFrame(frameData);
              } catch (err) {
                console.error("Error capturing frame:", err);
              }
            }
          }, 100); // 10fps for real-time display
          
          // Store interval ID for cleanup
          window.frameCaptureInterval = frameInterval;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setActiveCameraState(false);
      }
    }
    startCamera();

    return () => {
      setActiveCameraState(false);
      if (window.frameCaptureInterval) {
        clearInterval(window.frameCaptureInterval);
      }
      // Don't stop the stream here because Monitor might still be using it
    };
  }, [setActiveCameraState, setVideoStream, updateCameraFrame]);

  // -----------------------------
  // CAPTURE + SEND FOR FACE RECOGNITION
  // -----------------------------
  const captureAndSend = useCallback(async () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0 || !isScanning)
      return;

    setIsScanning(false);

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.7);

    try {
      const response = await fetch("http://localhost:5000/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await response.json();

      // Add local log entry
      setLogs((prev) => [
        `Time: ${new Date().toLocaleTimeString()} | Detected: ${result.detected} | Authenticated: ${result.authenticated} | Name: ${result.name || "N/A"} | LogType: ${result.log_type || "N/A"}`,
        ...prev.slice(0, 9),
      ]);

      if (result.detected && result.authenticated) {
        setLocalCameraStatus("detected");
        setAuthenticatedName(result.name);
        setDepartment(result.department);
        setAuthTime(result.time);
        setLogType(result.log_type);

        // Update camera context with detected face info for Monitor
        updateCameraStatus("detected", {
          name: result.name,
          department: result.department,
          studentId: result.student_id || result.name,
          logType: result.log_type,
        });

        // Add log to global context
        addLog({
          name: result.name,
          studentId: result.student_id || result.name,
          action: result.log_type === "Entrance" ? "ENTRY" : "EXIT",
          method: "FACE",
          time: result.time,
        });

        // AUTO RESET UI
        setTimeout(() => {
          setLocalCameraStatus("neutral");
          setAuthenticatedName("");
          setDepartment("");
          setAuthTime("");
          setLogType("");
          updateCameraStatus("neutral");
        }, 4000);
      } else if (result.detected && !result.authenticated) {
        setLocalCameraStatus("unauthorized");
        setAuthTime(result.time);
        setAuthenticatedName("");
        setDepartment("");
        setLogType("");

        // Update camera context for unauthorized face
        updateCameraStatus("unauthorized");

        // Add failed log to global context
        addFailedLog();
        
        // AUTO RESET UI
        setTimeout(() => {
          setLocalCameraStatus("neutral");
          updateCameraStatus("neutral");
        }, 3000);
      } else {
        setLocalCameraStatus("neutral");
        setAuthenticatedName("");
        setDepartment("");
        setAuthTime("");
        setLogType("");
        updateCameraStatus("neutral");
      }
    } catch (err) {
      console.error(err);
      setLocalCameraStatus("neutral");
      setLogs((prev) => [`Error: ${err.message}`, ...prev.slice(0, 9)]);
      updateCameraStatus("neutral");
    }

    // COOLDOWN
    setTimeout(() => setIsScanning(true), 3000);
  }, [isScanning, addLog, addFailedLog, updateCameraFrame, updateCameraStatus]);

  // -----------------------------
  // AUTO SCAN LOOP
  // -----------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      captureAndSend();
    }, 2000); // Scan every 2 seconds

    return () => clearInterval(interval);
  }, [captureAndSend]);

  // -----------------------------
  // TIME / DATE
  // -----------------------------
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const manilaTime = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(now);

      const manilaDate = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(now);

      const manilaDay = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "long",
      }).format(now);

      setTime(manilaTime);
      setDate(manilaDate);
      setDay(manilaDay);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // -----------------------------
  // GREETINGS
  // -----------------------------
  const greetings = [
    "Mabuhay! Ready to learn,",
    "Kamusta! Let's start the day,",
    "Magandang Araw,",
    "Magandang Araw! Keep it up,",
    "Kumusta? Attendance check,",
    "Mabuhay! Salamat sa pagdating,",
    "Hi! Ready for class, ",
    "Maligayang pagdating! Let's go, ",
    "Uy! Kamusta? Log in na, ",
    "L E T apostrophe S  G O! LETSGO",
    "Pasok na sa PLP! AnOh? tAraH?",
  ];

  const [greeting, setGreeting] = useState(greetings[0]);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        index = (index + 1) % greetings.length;
        setGreeting(greetings[index]);
        setFade(true);
      }, 500);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // -----------------------------
  // MANUAL ID HANDLER
  // -----------------------------
  const handleManualIdSubmit = async (e) => {
    e.preventDefault();

    if (!manualId.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Invalid ID",
        text: "Please enter a valid ID number",
      });
      return;
    }

    setManualIdLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/manual-id-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ studentId: manualId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        const action = result.action || "ENTRY";
        
        addLog({
          name: result.name,
          studentId: manualId,
          action: action,
          method: "MANUAL ID",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });

        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: `Welcome ${result.name}! ${action} recorded successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });

        setShowManualIdModal(false);
        setManualId("");
      } else {
        Swal.fire({
          icon: "error",
          title: "Invalid ID",
          text: result.message || "Student ID not found in the system",
        });
      }
    } catch (error) {
      console.error("Manual ID error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to process manual ID entry. Please try again.",
      });
    }

    setManualIdLoading(false);
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="dashboard">
      {/* LEFT SIDE CAMERA */}
      <div
        className={`camera-side ${
          localCameraStatus === "neutral"
            ? ""
            : localCameraStatus === "detected"
            ? "green-border"
            : localCameraStatus === "unauthorized"
            ? "red-border"
            : ""
        }`}
      >
        <video ref={videoRef} autoPlay playsInline className="camera-video" />

        <div className="camera-text">
          {localCameraStatus === "neutral" &&
            "Please look at the camera and position your face..."}
          {localCameraStatus === "detected" &&
            `Welcome, ${authenticatedName}! Face recognized.`}
          {localCameraStatus === "unauthorized" &&
            "Face not recognized. Please look at the camera again."}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="ui-side">
        <div className="school-info">
          <img src="/logoplp.gif" alt="School Logo" className="school-logo" />
          <div className="school-text">
            <h1>PAMANTASAN NG LUNGSOD NG PASIG</h1>
            <hr />
            <p>ENTRANCE AND EXIT MONITORING SYSTEM</p>
          </div>
        </div>

        <div className="mabuhay-section">
          <div className="greet">
            <h2
              className={`${fade ? "fade-text fade-in" : "fade-text fade-out"}`}
            >
              {greeting}
            </h2>
            <p className={`plpian ${fade ? "fade-in" : "fade-out"}`}>
              {greeting !== greetings[greetings.length - 1] ? "PLPian!" : ""}
            </p>
          </div>

          <div className="time-status-section">
            <div className="time-date">
              <p className="time">{time}</p>
              <p className="date">
                {date}
                <br />
                {day}
              </p>
            </div>
          </div>

          <div className="message-box">
            {localCameraStatus === "neutral" &&
              "Welcome! Please scan your face for attendance."}
            {localCameraStatus === "detected" &&
              `Welcome back, ${authenticatedName}! Department: ${department}.`}
            {localCameraStatus === "unauthorized" &&
              "Face not recognized. Please try again."}
          </div>
        </div>
        <button
          className="bottom-btn manual-id-btn"
          onClick={() => setShowManualIdModal(true)}
        >
          Manual ID Entry
        </button>

        <div className="status-box">
          {localCameraStatus === "neutral" && (
            <>
              <h2>
                <strong>FACIAL AUTHENTICATION SYSTEM</strong>
              </h2>
              <p>Status updates will appear after scan.</p>
            </>
          )}

          {localCameraStatus === "detected" && (
            <>
              <h2>
                <strong>AUTHENTICATION SUCCESSFUL!</strong>
              </h2>
              <p>
                Time: <span>{authTime}</span>
              </p>
              <p>
                Status: <span>{logType}</span>
              </p>
              <p>
                Method: <span>Facial Recognition</span>
              </p>
            </>
          )}

          {localCameraStatus === "unauthorized" && (
            <>
              <h2>
                <strong>AUTHENTICATION FAILED!</strong>
              </h2>
              <p>
                Time: <span>{authTime}</span>
              </p>
              <p>
                Status: <span>ACCESS DENIED</span>
              </p>
              <p>
                Method: <span>Facial Recognition</span>
              </p>
            </>
          )}
        </div>

        <div className="bottom-buttons-container">
          <Link to="/" className="back-btn">
            <FaArrowLeft style={{ marginRight: "8px" }} />
            Back
          </Link>
        </div>
      </div>

      {/* Manual ID Modal */}
      {showManualIdModal && (
        <div
          className="fr-modal-overlay"
          onClick={() => setShowManualIdModal(false)}
        >
          <div
            className="fr-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fr-modal-header">
              <h3>Manual ID Entry</h3>
              <button
                className="fr-modal-close"
                onClick={() => setShowManualIdModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualIdSubmit} className="fr-modal-form">
              <div className="fr-modal-info">
                <p>
                  Please use this option only if facial recognition is
                  unavailable. Your attendance will be manually recorded.
                </p>
              </div>

              <div className="fr-input-field">
                <label htmlFor="fr-manual-id">Student ID Number</label>
                <input
                  id="fr-manual-id"
                  type="text"
                  placeholder="Enter your student ID (e.g., 23-00174)"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  required
                  disabled={manualIdLoading}
                  autoFocus
                />
                <div className="fr-input-hint">
                  Enter your PLP student ID number as it appears on your school ID
                </div>
              </div>

              <div className="fr-modal-buttons">
                <button
                  type="button"
                  className="fr-btn-cancel"
                  onClick={() => setShowManualIdModal(false)}
                  disabled={manualIdLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="fr-btn-submit"
                  disabled={manualIdLoading}
                >
                  {manualIdLoading ? " Processing..." : "✓ Submit Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FaceRecognition;