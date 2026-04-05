import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import '../css/MethodSelection.css';
import { LuScanFace, LuScanQrCode } from "react-icons/lu";
import { RiInputField } from "react-icons/ri";
import { FaUserClock } from "react-icons/fa";
import ManualInputModal from "../components/ManualInputModal";
import QRScanModal      from "../components/QRScanModal";
import VisitorModal     from "../components/VisitorModal";

function EntranceMethodSelection() {
  const [dateTime, setDateTime]   = useState(new Date());
  const [activeModal, setActiveModal] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const navigate = useNavigate();

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDay  = (date) => date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const formatDate = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    return `${d} / ${m} / ${y}`;
  };

  const methods = [
    { key: 'f', action: () => navigate('/facerecog'), icon: <LuScanFace />,   label: "Face Scan",    description: "Verify via camera scan." },
    { key: 'q', action: () => setActiveModal('qr'),   icon: <LuScanQrCode />, label: "Scan QR",      description: "Verify via QR code." },
    { key: 'm', action: () => setActiveModal('manual'),icon: <RiInputField />, label: "Manual Input", description: "Enter Student ID number manually." },
    { key: 'v', action: () => setActiveModal('visitor'),icon: <FaUserClock />, label: "Visitor",      description: "Register for a temporary pass." },
  ];

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.key) return;
  
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA'
      ) return;
  
      const key = e.key.toLowerCase();
  
      const selected = methods.find(m => m.key === key);
  
      if (selected) {
        e.preventDefault();
        setActiveKey(key);
        selected.action();
        setTimeout(() => setActiveKey(null), 150);
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [methods]);

  return (
    <div className="selection-container">
      <div className="selection-overlay">

        <div className="selection-header">
          <img src="../logoplp.gif" alt="PLP Logo" className="selection-logo" />
          <h1 className="selection-title">Pamantasan ng Lungsod ng Pasig</h1>
          <div className="selection-divider" />
          <p className="selection-subtitle">
            An Integrated Smart Entrance, Exit, and Attendance Monitoring System with Data
            Analytics for Institutional Decision Support at Pamantasan ng Lungsod ng Pasig
          </p>
        </div>

        <div className="date-time">
          <span className="dt-time">{formatTime(dateTime)}</span>
          <span className="dt-dot">•</span>
          <span className="dt-day">{formatDay(dateTime)}</span>
          <span className="dt-dot">•</span>
          <span className="dt-date">{formatDate(dateTime)}</span>
        </div>

        <div className="selections">
          <div className="mode-badge entry-badge">ENTRANCE</div>
          <p className="selections-prompt">
            Please select your preferred identification method for{' '}
            <span className="emphasize-entry">entry</span>. <br />
            Press <span className="emphasize-keys">F, Q, M, or V</span> to proceed instantly.
          </p>
          <div className="selection-options">
            {methods.map(({ key, action, icon, label, description }) => (
              <div
                className={`selection-card ${activeKey === key ? 'active-key' : ''}`}
                key={label}
                onClick={action}
              >
                <div className="selection-card-icon">{icon}</div>
                <div className="selection-card-body">
                  <h2 className="selection-card-label">{label}</h2>
                  <div className="selection-card-divider" />
                  <div className="selection-card-desc">
                    <p>{description}</p>
                    <p className="shortcut-key">{key.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="selection-footer">
          <p>© BSIT 3E 2025-2026 • Pamantasan ng Lungsod ng Pasig. All rights reserved.</p>
        </div>
      </div>

      {activeModal === 'manual'  && <ManualInputModal mode="ENTRY" onClose={() => setActiveModal(null)} />}
      {activeModal === 'qr'      && <QRScanModal      mode="ENTRY" onClose={() => setActiveModal(null)} />}
      {activeModal === 'visitor' && <VisitorModal                  onClose={() => setActiveModal(null)} />}
    </div>
  );
}

export default EntranceMethodSelection;