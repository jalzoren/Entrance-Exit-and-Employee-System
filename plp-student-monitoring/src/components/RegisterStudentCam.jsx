import React, { useRef, useEffect, useState } from 'react';
import { 
  MdClose, 
  MdCameraAlt, 
  MdArrowUpward, 
  MdArrowDownward, 
  MdArrowBack, 
  MdArrowForward,
  MdOutlineFace,
  MdFlipCameraIos,
  MdCheckCircle,
  MdInfoOutline,
  MdTimer
} from "react-icons/md";
import '../componentscss/RegisterStudentCam.css';

function RegisterStudentCam({ 
  showCamera, 
  onClose, 
  captureStep, 
  captureSteps, 
  onCapture,
  getDirectionIcon 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionTimer, setInstructionTimer] = useState(30);

  useEffect(() => {
    if (showCamera) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 480 },
          height: { ideal: 640 },
          facingMode: "user",
          aspectRatio: 0.75
        } 
      })
        .then((mediaStream) => {
          streamRef.current = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err);
          alert("Could not access camera. Please make sure you have granted camera permissions.");
          onClose();
        });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera, onClose]);

  // Instruction timer countdown
  useEffect(() => {
    if (showCamera && showInstructions && instructionTimer > 0) {
      const timer = setTimeout(() => {
        setInstructionTimer(instructionTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCamera && showInstructions && instructionTimer === 0) {
      // Auto-close instructions and start capture
      setShowInstructions(false);
      startCapture();
    }
  }, [showCamera, showInstructions, instructionTimer]);

  const startCapture = () => {
    setIsCapturing(true);
    setCountdown(3);
  };

  const handleStartCapture = () => {
    setShowInstructions(false);
    startCapture();
  };

  // Automatic capture with countdown
  useEffect(() => {
    if (showCamera && !showInstructions && !isCapturing && !countdown) {
      // Start countdown after 2 seconds
      const timer = setTimeout(() => {
        setIsCapturing(true);
        setCountdown(3);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showCamera, showInstructions, isCapturing, countdown]);

  // Handle countdown
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Capture photo when countdown reaches 0
      capturePhoto();
      setCountdown(null);
      setIsCapturing(false);
    }
  }, [countdown]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const photoDataUrl = canvas.toDataURL('image/png');
      onCapture(photoDataUrl);
    }
  };

  const handleManualCapture = () => {
    capturePhoto();
    setCountdown(null);
    setIsCapturing(false);
  };

  if (!showCamera) return null;

  return (
    <div className="camera-modal">
      <div className={`camera-modal-content ${isCapturing ? 'capturing' : ''}`}>
        <div className="camera-header">
          <h4>Capture {captureSteps[captureStep].text}</h4>
          <button className="close-camera-btn" onClick={onClose}>
            <MdClose />
          </button>
        </div>
        
        <div className="camera-container">
          <video ref={videoRef} className="camera-preview" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {/* Instruction Popup */}
          {showInstructions && (
            <div className="instruction-popup">
              <div className="instruction-content">
                <div className="instruction-icon">
                  <MdInfoOutline />
                </div>
                <h3>Photo Capture Instructions</h3>
                <ul className="instruction-list">
                  <li>Position your face within the oval frame</li>
                  <li>Ensure good lighting on your face</li>
                  <li>Remove glasses if they cause glare</li>
                  <li>Look straight at the camera</li>
                  <li>Stay still during capture</li>
                </ul>
                <div className="instruction-timer">
                  <MdTimer className="timer-icon" />
                  <span>Auto-start in {instructionTimer}s</span>
                </div>
                <div className="instruction-actions">
                  <button className="btn instruction-btn" onClick={handleStartCapture}>
                    Start Now
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Facial Recognition Overlay - only show when instructions are closed */}
          {!showInstructions && (
            <div className="face-overlay">
              <div className={`face-frame ${isCapturing ? 'capturing' : ''}`}>
                {getDirectionIcon(captureStep)}
              </div>
            </div>
          )}
          
          {/* Countdown Overlay */}
          {countdown !== null && !showInstructions && (
            <div className="countdown-overlay">
              <div className="countdown-number">{countdown}</div>
            </div>
          )}
          
          {/* Guidance Text - only show when instructions are closed */}
          {!showInstructions && (
            <div className="guidance-text">
              <p className="main-guidance">Please look at the camera</p>
              <p className="instruction-guidance">and position your face within the on-screen frame.</p>
              <p className="step-guidance">Scanned Photo: {captureStep}/{captureSteps.length}</p>
              <p className="action-guidance">
                Now: <span>{captureSteps[captureStep].instruction}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegisterStudentCam;