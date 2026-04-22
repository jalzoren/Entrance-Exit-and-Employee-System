// QRScanModal.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import '../componentscss/QRScanModal.css';
import { showEntryExitAlert } from '../components/ShowEntryExitAlerts.jsx';
import { useLogContext } from '../context/LogContext';

function QRScanModal({ onClose, mode = 'ENTRY' }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const scannedRef = useRef(false);
  const { addLog } = useLogContext();  // MAKE SURE THIS IS HERE

  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);

  // Format year level number to text
  const formatYearLevel = (yearNumber) => {
    if (!yearNumber && yearNumber !== 0) return "Not Specified";
    const yearMap = {
      1: "1st Year",
      2: "2nd Year",
      3: "3rd Year",
      4: "4th Year",
      5: "5th Year",
      6: "6th Year"
    };
    return yearMap[yearNumber] || `${yearNumber}th Year`;
  };

  const handleQRResult = useCallback(async (qrData) => {
    if (loading) return;
    
    setLoading(true);
    setStatus(null);

    try {
      console.log('📱 Raw QR data:', qrData);
      
      const res = await fetch('http://localhost:5000/api/qrscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: qrData, mode }),
      });

      const data = await res.json();
      console.log('📱 Server response:', data);
      
      if (!res.ok) throw new Error(data.message || 'QR scan failed.');

      // Format the year level
      const formattedYearLevel = formatYearLevel(data.year_level);
      console.log('📱 Year Level:', data.year_level, '→', formattedYearLevel);
      console.log('📱 Student ID:', data.student_id);
      console.log('📱 Student Name:', data.student);
      console.log('📱 Department:', data.department);

      // IMPORTANT: Add log to context with complete student data
      const logEntry = {
        studentId: data.student_id,  // This should be "23-00174"
        name: data.student,           // This should be "Flavier, Laurence James"
        action: mode,
        method: 'QR',
        collegeDept: data.department,
        yearLevel: formattedYearLevel,  // This should be "3rd Year"
        course: data.course,
        gender: data.gender
      };
      
      console.log('📱 Adding to context:', logEntry);
      addLog(logEntry);

      showEntryExitAlert({
        action: data.action || mode,
        student: data.student,
        department: data.department,
      });

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('❌ QR Scan Error:', err);
      setStatus({ type: 'error', message: err.message });
      scannedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    } finally {
      setLoading(false);
    }
  }, [mode, onClose, addLog, loading]);

  const scanFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && !scannedRef.current && !loading) {
        console.log('📷 QR Code detected:', code.data);
        scannedRef.current = true;
        handleQRResult(code.data);
        return;
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [handleQRResult, loading]);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            console.log('📷 Camera started');
          } catch (err) {
            console.warn('Video play interrupted:', err.message);
          }
          setTimeout(() => {
            if (isMounted && !loading) {
              rafRef.current = requestAnimationFrame(scanFrame);
            }
          }, 500);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setStatus({ type: 'error', message: 'Camera access denied or unavailable.' });
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [scanFrame, loading]);

  const handleRetry = () => {
    if (loading) return;
    scannedRef.current = false;
    setStatus(null);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Scan QR Code</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="qr-viewport">
            <video ref={videoRef} className="qr-video" muted playsInline />
            <canvas ref={canvasRef} className="qr-canvas" />
            <div className="qr-overlay">
              <div className="qr-corner tl" /><div className="qr-corner tr" />
              <div className="qr-corner bl" /><div className="qr-corner br" />
            </div>
          </div>
          <p className="modal-hint">
            <span style={{ fontWeight: 'bold' }}>For Student: </span>
            Position your QR found in school ID to the scanner.*<br />
            <span style={{ fontWeight: 'bold' }}>For Visitor: </span>
            Position your QR received from the email.*
          </p>
          {loading && <p className="modal-status info">Processing scan…</p>}
          {status  && <p className={`modal-status ${status.type}`}>{status.message}</p>}
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="modal-btn submit" onClick={handleRetry} disabled={loading}>Retry</button>
        </div>
      </div>
    </div>
  );
}

export default QRScanModal;