import { useRef, useEffect, useState } from "react";
import "../css/FaceRecognition.css";
import { Link } from "react-router-dom";

function FaceRecognition() {
  const videoRef = useRef(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
  }, []);

  const captureAndSend = async () => {
  if (!videoRef.current) return;

  const canvas = document.createElement("canvas");
  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoRef.current, 0, 0);

  const imageData = canvas.toDataURL("image/jpeg");

  try {
    const response = await fetch("http://localhost:5000/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData }),
    });

    const result = await response.json();

    if (result.detected && result.authenticated) {
      setCameraStatus("detected");
      setAuthenticatedName(result.name);
      setDepartment(result.department);
      setAuthTime(result.time);
    } else if (result.detected && !result.authenticated) {
      setCameraStatus("unauthorized");
      setAuthTime(result.time);
      setAuthenticatedName("");
      setDepartment("");
    } else {
      setCameraStatus("neutral");
      setAuthenticatedName("");
      setDepartment("");
      setAuthTime("");
    }
  } catch (err) {
    console.error(err);
    setCameraStatus("neutral");
  }
};

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

  // Array of greetings
  const greetings = [
    "Mabuhay! Ready to learn,",
    "Kamusta! Let's start the day,",
    "Magandang Umaga,",
    "Magandang Araw! Keep it up,",
    "Kumusta? Attendance check,",
    "Mabuhay! Salamat sa pagdating,",
    "Hi! Ready for class, ",
    "Maligayang pagdating! Let's go, ",
    "Uy! Kamusta PLPian? Log in na, ",
    "L E T apostrophe S  G O! LETSGO",

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


  const [cameraStatus, setCameraStatus] = useState("neutral"); // neutral / detected / unauthorized
const [authenticatedName, setAuthenticatedName] = useState(""); // name from Python
const [department, setDepartment] = useState(""); // department from Python
const [authTime, setAuthTime] = useState(""); // timestamp from Python
  return (
    <div className="dashboard">
  {/* Left side: Camera */}
  <div className={`camera-side ${
      cameraStatus === "neutral" ? "" :
      cameraStatus === "detected" ? "green-border" :
      cameraStatus === "unauthorized" ? "red-border" : ""
    }`}
  >
    <video ref={videoRef} autoPlay playsInline className="camera-video" />

 

<div className="camera-text">
  {cameraStatus === "neutral" && "Please look at the camera and position your face..."}
  {cameraStatus === "detected" && `Welcome, ${authenticatedName}! Face recognized.`}
  {cameraStatus === "unauthorized" && "Face not recognized. Please look at the camera again."}
</div>  </div>

  {/* Right side: UI */}
  <div className="ui-side">
    <Link to="/" className="logo-link">Back</Link>
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
        <h2 className={`${fade ? "fade-text fade-in" : "fade-text fade-out"}`}>
          {greeting}
        </h2>
        <p className="plpian"> PLPian!</p>
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
        {cameraStatus === "neutral" && "Welcome! Please scan your face for attendance."}
        {cameraStatus === "detected" && `Welcome back, ${authenticatedName}! Department: ${department}.`}
        {cameraStatus === "unauthorized" && "Face not recognized. Please try again."}
      </div>
    </div>

    <div className="status-box">
      {cameraStatus === "neutral" && (
        <>
          <h2><strong>FACIAL AUTHENTICATION SYSTEM</strong></h2>
          <p>Status updates will appear after scan.</p>
        </>
      )}
      {cameraStatus === "detected" && (
        <>
          <h2><strong>AUTHENTICATION SUCCESSFUL!</strong></h2>
          <p>Time: <span>{authTime}</span></p>
          <p>Status: <span>ENTRY - Logged In</span></p>
          <p>Method: <span>Facial Recognition</span></p>
        </>
      )}
      {cameraStatus === "unauthorized" && (
        <>
          <h2><strong>AUTHENTICATION FAILED!</strong></h2>
          <p>Time: <span>{authTime}</span></p>
          <p>Status: <span>ENTRY - Denied</span></p>
          <p>Method: <span>Facial Recognition</span></p>
        </>
      )}
    </div>
  </div>
</div>
  );
}

export default FaceRecognition;
