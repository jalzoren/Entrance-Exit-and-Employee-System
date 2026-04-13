// EntranceFaceRecognition.jsx
import { useRef, useEffect, useState, useCallback } from "react";
import "../css/FaceRecognition.css";
import { useLogContext } from "../context/LogContext.jsx";
import { useCameraContext } from "../context/CameraContext.jsx";
import { showEntryExitAlert } from "../components/ShowEntryExitAlerts.jsx";
import Swal from "sweetalert2";
import { LuScanQrCode } from "react-icons/lu";
import { RiInputField } from "react-icons/ri";
import { FaUserClock } from "react-icons/fa";
import { LuVideo, LuVideoOff } from "react-icons/lu";
import ManualInputModal from "../components/ManualInputModal.jsx";
import QRScanModal from "../components/QRScanModal.jsx";
import VisitorModal from "../components/VisitorModal.jsx";

function FaceRecognition({ mode = 'ENTRY' }) {
  const videoRef        = useRef(null);
  const hasActed        = useRef(false);
  const failCountRef    = useRef(0);
  const scanIntervalRef = useRef(null);
  const cameraOnRef     = useRef(false);

  const { addLog } = useLogContext();
  const {
    updateCameraFrame,
    updateCameraStatus,
    setActiveCameraState,
    setVideoStream,
  } = useCameraContext();

  const [cameraOn, setCameraOn]         = useState(false);
  const [cameraStatus, setCameraStatus] = useState('neutral');
  const [activeModal, setActiveModal]   = useState(null);
  const [activeKey, setActiveKey]       = useState(null);

  // ── Pause camera when any modal is open ───────────────────────────────
  const wasOnBeforeModalRef = useRef(false);

  // the useEffect becomes:
  useEffect(() => {
    if (activeModal !== null) {
      // Modal opened — remember camera state, then pause
      wasOnBeforeModalRef.current = cameraOnRef.current;
      clearInterval(scanIntervalRef.current);
      setCameraOn(false);
    } else {
      // Modal closed — restore camera if it was on before
      if (wasOnBeforeModalRef.current) {
        setCameraOn(true);
      }
    }
  }, [activeModal]);

  // ── Keep ref in sync with state so callbacks can read it ──
  useEffect(() => {
    cameraOnRef.current = cameraOn;
  }, [cameraOn]);

  // ── Clock ─────────────────────────────────────────
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [day, setDay]   = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }).format(now));
      setDate(new Intl.DateTimeFormat('en-GB',  { timeZone: 'Asia/Manila', day: '2-digit', month: '2-digit', year: '2-digit' }).format(now));
      setDay(new Intl.DateTimeFormat('en-PH',   { timeZone: 'Asia/Manila', weekday: 'long' }).format(now).toUpperCase());
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Greeting ──────────────────────────────────────
  const greetings = [
    "Mabuhay! Ready to learn",
    "Kamusta! Let's start the day",
    "Magandang Araw",
    "Magandang Araw! Keep it up",
    "Kumusta? Attendance check",
    "Hi! Ready for class",
    "Maligayang pagdating!",
  ];
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setGreetingIdx(i => (i + 1) % greetings.length);
        setFade(true);
      }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  // ── Alt methods ───────────────────────────────────
  const altMethods = [
    { key: 'q', action: () => setActiveModal('qr'),      icon: <LuScanQrCode />, label: 'Scan QR',      desc: 'Scan your student ID code.' },
    { key: 'm', action: () => setActiveModal('manual'),  icon: <RiInputField />, label: 'Manual Input', desc: 'Enter Student ID number manually.' },
    { key: 'v', action: () => setActiveModal('visitor'), icon: <FaUserClock />,  label: 'Visitor',      desc: 'Register for a temporary pass.' },
  ];

  // ── Keyboard shortcuts ────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Safe check for e.key existence
      if (!e.key) return;
      
      const k = e.key.toLowerCase();
      
      // Don't trigger if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const found = altMethods.find(m => m.key === k);
      if (found) {
        e.preventDefault();
        setActiveKey(k);
        found.action();
        setTimeout(() => setActiveKey(null), 150);
      }
    };
    
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [altMethods]);

  // ── Camera startup/shutdown ───────────────────────
  useEffect(() => {
    if (!cameraOn) return;

    let frameInterval = null;
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setActiveCameraState(true);
          setVideoStream(stream);

          frameInterval = setInterval(() => {
            if (videoRef.current?.videoWidth > 0) {
              const canvas = document.createElement('canvas');
              canvas.width  = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
              updateCameraFrame(canvas.toDataURL('image/jpeg', 0.7));
            }
          }, 100);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setActiveCameraState(false);
      }
    };

    startCamera();

    return () => {
      setActiveCameraState(false);
      if (frameInterval) clearInterval(frameInterval);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraOn]);

  // ── restartScan ───────────────────────────────────
  const captureAndSendRef = useRef(null);

  const restartScan = useCallback(() => {
    if (!cameraOnRef.current) return;
    hasActed.current     = false;
    failCountRef.current = 0;
    clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => captureAndSendRef.current?.(), 2000); // ← ref
  }, []);

  // ── Recognition loop ──────────────────────────────
  const captureAndSend = useCallback(async () => {
    if (hasActed.current) return;
    if (!videoRef.current || videoRef.current.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const res    = await fetch('http://localhost:5000/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mode }),
      });
      const result = await res.json();

      // ── Case 1: No face / unrecognized ───────────
      if (!result.recognized) {
        failCountRef.current += 1;

        if (failCountRef.current >= 2) {
          hasActed.current = true;
          clearInterval(scanIntervalRef.current);

          await Swal.fire({
            html: `
              <div style="font-family:'Montserrat',sans-serif; padding:4px 0;">
                <p style="font-size:1rem;color:#333;margin:0;line-height:1.6;">
                  Unable to identify your face.<br/>
                  Please choose <strong>Scan QR</strong> or <strong>Manual Input</strong> as an alternative.
                </p>
              </div>
            `,
            icon: 'warning',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
            width: '380px',
          });

          restartScan();
        }
        return;
      }

      // ── Case 2: Face matched but validation failed ─
      hasActed.current = true;
      failCountRef.current = 0;
      clearInterval(scanIntervalRef.current);

      if (!result.validated) {
        setCameraStatus('unauthorized');
        updateCameraStatus('unauthorized');

        await Swal.fire({
          html: `<div style="font-family:'Montserrat',sans-serif;">
            <p style="font-size:1rem;color:#333;margin:0;">${result.message}</p>
          </div>`,
          icon: 'warning',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
          width: '360px',
        });

        setCameraStatus('neutral');
        updateCameraStatus('neutral');
        restartScan();
        return;
      }

      // ── Case 3: Success ───────────────────────────
      setCameraStatus('detected');
      updateCameraStatus('detected', {
        name:       result.student,
        department: result.department,
        studentId:  result.student_id,
        logType:    result.action,
      });

      addLog({
        name:      result.student,
        studentId: result.student_id,
        action:    result.action,
        method:    'FACE',
        time:      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });

      setTimeout(() => {
        setCameraStatus('neutral');
        updateCameraStatus('neutral');
        showEntryExitAlert({
          action:     result.action,
          student:    result.student,
          department: result.department,
        });
        setTimeout(restartScan, 3200);
      }, 1500);

    } catch (err) {
      console.error('[FaceRecognition error]', err);
    }
  }, [mode, addLog, updateCameraStatus, restartScan]);

  useEffect(() => {
    captureAndSendRef.current = captureAndSend;
  }, [captureAndSend]);

  // ── Start scan loop when camera turns on ─────────
  useEffect(() => {
    if (!cameraOn) return;
    scanIntervalRef.current = setInterval(captureAndSend, 2000);
    return () => clearInterval(scanIntervalRef.current);
  }, [cameraOn, captureAndSend]);

  const camClass = ['camera-side',
    cameraStatus === 'detected'     ? 'green-border' : '',
    cameraStatus === 'unauthorized' ? 'red-border'   : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="fr-unified-page">

      {/* ══ LEFT — Camera ══════════════════════════ */}
      <div className={camClass}>
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />

        {/* Corner brackets */}
        <div className="fr-corner fr-tl" /><div className="fr-corner fr-tr" />
        <div className="fr-corner fr-bl" /><div className="fr-corner fr-br" />

        {/* Status text */}
        <div className="camera-text">
          {!cameraOn                               && 'Camera is off. Press Start Camera to begin scanning.'}
          {cameraOn && cameraStatus === 'neutral'      && 'Please look at the camera and position your face within the on-screen frame.'}
          {cameraOn && cameraStatus === 'detected'     && 'Face recognized! Recording...'}
          {cameraOn && cameraStatus === 'unauthorized' && 'Access denied. See message on screen.'}
        </div>

        {/* ── Camera toggle button — bottom center of camera panel ── */}
        <button
          className={`fr-cam-toggle ${cameraOn ? 'fr-cam-stop' : 'fr-cam-start'}`}
          onClick={() => setCameraOn(prev => !prev)}
        >
          {cameraOn ? <><LuVideoOff /> Stop Camera</> : <><LuVideo /> Start Camera</>}
        </button>
      </div>

      {/* ══ RIGHT ══════════════════════════════════ */}
      <div className="fr-right-panel">
        
        <div className="fr-school-header">
          <img src="/logoplp.gif" alt="PLP Seal" className="fr-seal" />
          <div className="fr-school-text">
            <h1 className="fr-school-name">Pamantasan ng Lungsod ng Pasig</h1>
            <div className="fr-school-divider" />
            <p className="fr-school-sub">An Integrated Smart Entrance, Exit, and Attendance Monitoring System with Data
            Analytics for Institutional Decision Support at Pamantasan ng Lungsod ng Pasig</p>
          </div>
        </div>

        <div className="fr-greeting">
          <p className={`fr-greeting-text ${fade ? 'fade-in' : 'fade-out'}`}>
            {greetings[greetingIdx]}
          </p>
        </div>

        <div className="fr-clock">
          <span className="fr-time">{time}</span>
          <span className="fr-dot">•</span>
          <span className="fr-day">{day}</span>
          <span className="fr-dot">•</span>
          <span className="fr-date">{date}</span>
        </div>

        <div className={`fr-mode-badge ${mode === 'ENTRY' ? 'fr-badge-entry' : 'fr-badge-exit'}`}>
          {mode === 'ENTRY' ? 'ENTRANCE' : 'EXIT'}
        </div>

        <p className="fr-alt-prompt">
          If Face Scan failed to identify please choose an alternative.<br />
          Press <span className="fr-key-hint">Q, M, or V</span> to proceed instantly.
        </p>

        <div className="fr-alt-methods">
          {altMethods
            .map(({ key, action, icon, label, desc }) => (
              <div
                key={key}
                className={`fr-alt-card ${activeKey === key ? 'fr-card-active' : ''}`}
                onClick={action}
              >
                <div className="fr-alt-icon">{icon}</div>
                <div className="fr-alt-body">
                  <span className="fr-alt-label">{label}</span>
                  <div className="fr-alt-card-divider" />
                  <span className="fr-alt-desc">{desc}</span>
                </div>
                <span className="fr-shortcut">{key.toUpperCase()}</span>
              </div>
            ))
          }
        </div>
      </div>

      {activeModal === 'qr'      && <QRScanModal      mode={mode} onClose={() => setActiveModal(null)} />}
      {activeModal === 'manual'  && <ManualInputModal  mode={mode} onClose={() => setActiveModal(null)} />}
      {activeModal === 'visitor' && <VisitorModal                  onClose={() => setActiveModal(null)} />}
    </div>
  );
}

export default FaceRecognition;