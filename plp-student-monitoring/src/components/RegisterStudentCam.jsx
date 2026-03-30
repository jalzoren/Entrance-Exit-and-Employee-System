// RegisterStudentCam.jsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  MdClose,
  MdCheckCircle,
  MdInfoOutline,
  MdRadioButtonUnchecked,
  MdPanTool,
  MdWarningAmber,
} from "react-icons/md";
import '../componentscss/RegisterStudentCam.css';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const VALIDATION_INTERVAL_MS  = 250;
const PYTHON_INTERVAL_MS      = 600;
const BRIGHTNESS_MIN          = 60;
const BRIGHTNESS_MAX          = 210;
const MOTION_THRESHOLD        = 12;
const REQUIRED_PASSING_FRAMES = 4;

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function computeBrightness(imageData) {
  const { data } = imageData;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

function computeMotion(current, previous) {
  if (!previous || current.data.length !== previous.data.length) return 0;
  let total = 0;
  const n = current.data.length;
  for (let i = 0; i < n; i += 4) {
    total +=
      Math.abs(current.data[i]     - previous.data[i])     +
      Math.abs(current.data[i + 1] - previous.data[i + 1]) +
      Math.abs(current.data[i + 2] - previous.data[i + 2]);
  }
  return total / ((n / 4) * 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW CHECK STATE
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_RAW = {
  cameraOpen:   { passed: false, message: "Camera not ready"                    },
  faceDetected: { passed: false, message: "Move closer — no face found"         },
  brightness:   { passed: false, message: "Ensure good lighting on your face"   },
  noMask:       { passed: false, message: "Remove any face covering or mask"    },
  faceSharp:    { passed: false, message: "Hold still — image is too blurry"    }, // NEW
  correctPose:  { passed: false, message: "Follow the direction shown"          },
  notMoving:    { passed: false, message: "Hold still…"                         },
};

// Priority order — glasses intentionally excluded (soft warning only).
// faceSharp sits between noMask and correctPose:
//   we only ask for a specific angle once we know the frame is sharp enough.
const PRIORITY_ORDER = [
  'cameraOpen',
  'faceDetected',
  'brightness',
  'noMask',
  'faceSharp',    // NEW
  'correctPose',
  'notMoving',
];

const CHECK_LABELS = {
  cameraOpen:   "Camera ready",
  faceDetected: "Face in frame",
  brightness:   "Lighting",
  noMask:       "No face covering",
  faceSharp:    "Image sharpness",   // NEW
  correctPose:  "Head pose",
  notMoving:    "Staying still",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — derive single blocking message from raw checks
// ─────────────────────────────────────────────────────────────────────────────
function deriveStatus(raw) {
  for (const key of PRIORITY_ORDER) {
    if (!raw[key].passed) {
      return { allPassed: false, blockingKey: key, blockingMessage: raw[key].message };
    }
  }
  return { allPassed: true, blockingKey: null, blockingMessage: "All checks passed" };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function RegisterStudentCam({
  showCamera,
  onClose,
  captureStep,
  captureSteps,
  onCapture,
  getDirectionIcon,
}) {
  const videoRef        = useRef(null);
  const canvasRef       = useRef(null);
  const streamRef       = useRef(null);
  const prevFrameRef    = useRef(null);
  const validationTimer = useRef(null);
  const pythonTimer     = useRef(null);
  const countdownTimer  = useRef(null);
  const passingFrames   = useRef(0);
  const countdownActive = useRef(false);

  const [showInstructions, setShowInstructions] = useState(true);
  const [raw,              setRaw]              = useState(INITIAL_RAW);
  const [countdown,        setCountdown]        = useState(null);
  const [captureFlash,     setCaptureFlash]     = useState(false);
  const [glassesWarning,   setGlassesWarning]   = useState(false);

  const { allPassed, blockingKey, blockingMessage } = deriveStatus(raw);
  const passedCount = PRIORITY_ORDER.filter(k => raw[k].passed).length;

  // ── Camera lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showCamera) return;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width:       { ideal: 480 },
          height:      { ideal: 640 },
          facingMode:  "user",
          aspectRatio: 0.75,
        },
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setRaw(prev => ({
          ...prev,
          cameraOpen: { passed: true, message: "Camera ready" },
        }));
      })
      .catch((err) => {
        console.error("Camera error:", err);
        alert("Could not access camera. Please grant camera permissions.");
        onClose();
      });

    return () => {
      clearAllTimers();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [showCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restart when step changes or instructions dismissed ─────────────────────
  useEffect(() => {
    if (showInstructions || !showCamera) return;

    passingFrames.current   = 0;
    countdownActive.current = false;
    setCountdown(null);
    setGlassesWarning(false);

    setRaw(prev => ({
      cameraOpen:   prev.cameraOpen,
      faceDetected: { passed: false, message: "Move closer — no face found"       },
      brightness:   { passed: false, message: "Ensure good lighting on your face" },
      noMask:       { passed: false, message: "Remove any face covering or mask"  },
      faceSharp:    { passed: false, message: "Hold still — image is too blurry"  }, // NEW
      correctPose:  { passed: false, message: "Follow the direction shown"        },
      notMoving:    { passed: false, message: "Hold still…"                       },
    }));

    clearAllTimers();
    startLocalLoop();
    startPythonLoop();

    return () => clearAllTimers();
  }, [showInstructions, showCamera, captureStep]); // eslint-disable-line

  // ── Local loop: brightness + motion (250ms, no network) ────────────────────
  function startLocalLoop() {
    validationTimer.current = setInterval(() => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const W = 320, H = 240;
      canvas.width  = W;
      canvas.height = H;
      const ctx   = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, W, H);
      const frame = ctx.getImageData(0, 0, W, H);

      const lum          = computeBrightness(frame);
      const brightnessOk = lum >= BRIGHTNESS_MIN && lum <= BRIGHTNESS_MAX;
      const brightnessMsg =
        lum < BRIGHTNESS_MIN ? "Too dark — improve your lighting"      :
        lum > BRIGHTNESS_MAX ? "Too bright — reduce glare or step back" :
                               "Lighting looks good";

      const motion    = computeMotion(frame, prevFrameRef.current);
      const notMoving = motion < MOTION_THRESHOLD;
      prevFrameRef.current = frame;

      setRaw(prev => ({
        ...prev,
        brightness: { passed: brightnessOk, message: brightnessMsg },
        notMoving:  {
          passed:  notMoving,
          message: notMoving ? "Staying still" : "Hold still — too much movement",
        },
      }));
    }, VALIDATION_INTERVAL_MS);
  }

  // ── Python loop: face, glasses, mask, blur, pose (600ms) ───────────────────
  function startPythonLoop() {
    pythonTimer.current = setInterval(async () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      try {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", 0.75);

        const expectedPose = captureSteps[captureStep]?.icon ?? "center";

        const res = await fetch("http://localhost:5000/api/validate-frame", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ image: base64, expected_pose: expectedPose }),
        });

        if (!res.ok) return;

        // Response shape:
        // { face_detected, mask_detected, blur_ok, pose_ok, pose_label,
        //   message, glasses_detected, glasses_warning }
        const data = await res.json();

        setGlassesWarning(data.glasses_detected ?? false);

        setRaw(prev => ({
          ...prev,

          faceDetected: {
            passed:  data.face_detected,
            message: data.face_detected
              ? "Face detected"
              : "Move closer — position your face in the oval",
          },

          noMask: {
            passed:  !data.mask_detected,
            message: data.mask_detected
              ? "Remove any face covering or mask"
              : "No face covering detected",
          },

          // faceSharp — only meaningful once the face is visible.
          // blur_ok defaults to true in the Python response when the gate
          // hasn't been reached yet (e.g. face not detected), so we only
          // update this when we actually have a face to measure.
          ...(data.face_detected && {
            faceSharp: {
              passed:  data.blur_ok,
              message: data.blur_ok
                ? "Image is sharp"
                : "Hold still — image is too blurry",
            },
          }),

          // correctPose — only update when face is visible, same reason.
          ...(data.face_detected && {
            correctPose: {
              passed:  data.pose_ok,
              message: data.pose_ok
                ? `Pose correct: ${data.pose_label}`
                : data.message,
            },
          }),
        }));

      } catch {
        // Silent fail — keep previous values for this tick
      }
    }, PYTHON_INTERVAL_MS);
  }

  // ── Master evaluator ───────────────────────────────────────────────────────
  useEffect(() => {
    if (allPassed) {
      passingFrames.current += 1;
      if (passingFrames.current >= REQUIRED_PASSING_FRAMES && !countdownActive.current) {
        beginCountdown();
      }
    } else {
      passingFrames.current = 0;
      if (countdownActive.current) {
        clearInterval(countdownTimer.current);
        countdownActive.current = false;
        setCountdown(null);
        clearAllTimers();
        startLocalLoop();
        startPythonLoop();
      }
    }
  }, [raw]); // eslint-disable-line

  // ── Countdown ──────────────────────────────────────────────────────────────
  function beginCountdown() {
    if (countdownActive.current) return;
    countdownActive.current = true;
    clearAllTimers();

    let count = 3;
    setCountdown(count);

    countdownTimer.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownTimer.current);
        setCountdown(0);
        setTimeout(doCapture, 150);
      }
    }, 1000);
  }

  // ── Capture ────────────────────────────────────────────────────────────────
  const doCapture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.92);

    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 250);

    countdownActive.current = false;
    setCountdown(null);
    passingFrames.current = 0;

    onCapture(photoDataUrl);
  }, [onCapture]);

  // ── Manual override ────────────────────────────────────────────────────────
  const handleManualCapture = () => {
    clearAllTimers();
    countdownActive.current = false;
    setCountdown(null);
    doCapture();
  };

  function clearAllTimers() {
    clearInterval(validationTimer.current);
    clearInterval(pythonTimer.current);
    clearInterval(countdownTimer.current);
  }

  if (!showCamera) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="camera-modal">
      <div className={`camera-modal-content ${captureFlash ? 'capture-flash' : ''}`}>

        <div className="camera-header">
          <h4>
            {captureSteps[captureStep]?.text}
            <span className="step-badge"> — Step {captureStep + 1} of {captureSteps.length}</span>
          </h4>
          <button className="close-camera-btn" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <div className="camera-body">

          {/* ── LEFT: video feed ── */}
          <div className="camera-container">
            <video ref={videoRef} className="camera-preview" autoPlay muted playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!showInstructions && (
              <div className={`face-oval-ring ${allPassed ? 'ring-green' : 'ring-red'}`}>
                {getDirectionIcon(captureStep)}
              </div>
            )}

            {countdown !== null && !showInstructions && (
              <div className="countdown-overlay">
                <span className={`countdown-number ${countdown === 0 ? 'countdown-snap' : ''}`}>
                  {countdown === 0 ? '📸' : countdown}
                </span>
              </div>
            )}

            {!showInstructions && (
              <div className={`video-status-bar ${allPassed ? 'bar-green' : 'bar-scanning'}`}>
                {allPassed
                  ? (countdown !== null ? `Capturing in ${countdown}…` : 'All checks passed ✓')
                  : blockingMessage
                }
              </div>
            )}

            {showInstructions && (
              <div className="instruction-popup">
                <div className="instruction-content">
                  <div className="instruction-icon"><MdInfoOutline /></div>
                  <h3>Photo Capture Instructions</h3>
                  <ul className="instruction-list">
                    <li>Position your face within the oval frame</li>
                    <li>Ensure good lighting on your face</li>
                    <li>Remove any face covering such glasses or mask</li>
                    <li>Follow the direction shown for each shot</li>
                    <li>Stay still — the camera captures automatically</li>
                  </ul>
                  <p className="instruction-note">
                    The frame turns <strong>green</strong> when ready and captures automatically.
                  </p>
                  <p className="instruction-note" style={{ marginTop: '6px', opacity: 0.8 }}>
                    If auto-detection struggles, an admin can use
                    <strong> Manual Capture</strong> to override.
                  </p>
                  <div className="instruction-actions">
                    <button className="btn instruction-btn" onClick={() => setShowInstructions(false)}>
                      I Understand, Start
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: validation panel ── */}
          {!showInstructions && (
            <div className="validation-panel">

              <div className="panel-header">
                <span className="panel-title">Requirements</span>
                <span className={`panel-score ${passedCount === PRIORITY_ORDER.length ? 'score-full' : ''}`}>
                  {passedCount}/{PRIORITY_ORDER.length}
                </span>
              </div>

              <ul className="validation-list">
                {PRIORITY_ORDER.map((key) => {
                  const check   = raw[key];
                  const isBlock = key === blockingKey;
                  return (
                    <li
                      key={key}
                      className={`validation-item ${
                        check.passed ? 'item-pass' :
                        isBlock      ? 'item-block' :
                                       'item-pending'
                      }`}
                    >
                      {check.passed
                        ? <MdCheckCircle className="vi-icon pass-icon" />
                        : <MdRadioButtonUnchecked className={`vi-icon ${isBlock ? 'block-icon' : 'pending-icon'}`} />
                      }
                      <span className="vi-label">{CHECK_LABELS[key]}</span>
                      {isBlock && (
                        <span className="vi-hint">{check.message}</span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {glassesWarning && (
                <div className="glasses-warning">
                  <MdWarningAmber className="gw-icon" />
                  <span>Glasses detected — may reduce accuracy</span>
                </div>
              )}

              <div className="direction-guide">
                <p className="direction-heading">Required Pose:</p>
                <div className="direction-icon-wrap">{getDirectionIcon(captureStep)}</div>
                <p className="direction-instruction">
                  {captureSteps[captureStep]?.instruction}
                </p>
              </div>

              <div className="step-dots">
                {captureSteps.map((_, i) => (
                  <span
                    key={i}
                    className={`step-dot ${
                      i < captureStep   ? 'dot-done'    :
                      i === captureStep ? 'dot-current' : 'dot-pending'
                    }`}
                  />
                ))}
              </div>

              <div className="manual-capture-section">
                <button className="manual-capture-btn" onClick={handleManualCapture}>
                  <MdPanTool style={{ marginRight: '6px' }} />
                  Manual Capture
                </button>
                <p className="manual-capture-hint">
                  Use this if auto-detection cannot pass. An admin should
                  visually verify the image before registering.
                </p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default RegisterStudentCam;