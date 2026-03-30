import { useState, useEffect, useRef } from "react";
import "../../css/RealTimeMonitor.css";
import '../../css/Monitor.css';
import { useLogContext } from "../../context/LogContext";
import { useCameraContext } from "../../context/CameraContext";

function LogEntry({ log, animDelay }) {
  return (
    <>
      {log.failed ? (
        <div className="rtm-log-entry failed" style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time}]</span> — Failed Authentication Attempt
        </div>
      ) : (
        <div className={`rtm-log-entry success ${log.action.toLowerCase()}`} style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time}]</span>{" "}
          <span className="rtm-log-name">{log.name}</span>{" "}
          <span className="rtm-log-id">({log.studentId})</span>{" "}
          <span className={`rtm-log-action ${log.action.toLowerCase()}`}>{log.action}</span>{" "}
          <span className="rtm-log-method">via {log.method}</span>
        </div>
      )}
      <div className="rtm-log-divider" />
    </>
  );
}

export default function Monitor() {
  const { logs: contextLogs, studentsInside } = useLogContext();
  const { cameraFrame, cameraStatus, detectedFace, isCameraActive, videoStream } = useCameraContext();
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const logRef = useRef(null);
  const videoRef = useRef(null);
  const [streamAttached, setStreamAttached] = useState(false);

  // Effect to handle video stream from context with mirror effect
  useEffect(() => {
    if (videoRef.current && videoStream && !streamAttached) {
      try {
        console.log("✅ Monitor: Attaching video stream");
        videoRef.current.srcObject = videoStream;
        setStreamAttached(true);
        
        // Apply mirror effect via CSS transform
        videoRef.current.style.transform = 'scaleX(-1)';
        videoRef.current.style.webkitTransform = 'scaleX(-1)';
        
        // Try to play
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log("✅ Monitor: Video playing with mirror effect");
          }).catch((err) => {
            console.log("Video autoplay prevented:", err);
          });
        }
      } catch (err) {
        console.error("❌ Error attaching stream:", err);
      }
    }
  }, [videoStream, streamAttached]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logRef.current && filteredLogs.length > 0) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  // Apply filter and sort logs (oldest first, newest at bottom)
  useEffect(() => {
    let filtered = [];
    
    if (activeFilter === 'all') {
      filtered = [...contextLogs];
    } else if (activeFilter === 'entrance') {
      filtered = contextLogs.filter(log => !log.failed && log.action === "ENTRY");
    } else if (activeFilter === 'exit') {
      filtered = contextLogs.filter(log => !log.failed && log.action === "EXIT");
    }
    
    // Sort logs by timestamp to ensure chronological order (oldest first, newest at bottom)
    const sortedLogs = [...filtered].sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeA - timeB;
    });
    
    setFilteredLogs(sortedLogs);
  }, [contextLogs, activeFilter]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleResetFilter = () => {
    setActiveFilter('all');
  };

  const getStatusText = () => {
    if (!isCameraActive) return 'Camera offline - Go to Face Recognition';
    if (cameraStatus === 'detected' && detectedFace) {
      return `✓ RECOGNIZED\n${detectedFace.name}`;
    }
    if (cameraStatus === 'unauthorized') return '✗ UNAUTHORIZED';
    if (videoStream && streamAttached) return '🎥 LIVE FEED ACTIVE';
    return 'Waiting for camera...';
  };

  // Debug logging
  useEffect(() => {
    console.log("📊 Monitor Status:", {
      isCameraActive,
      hasVideoStream: !!videoStream,
      streamAttached,
      cameraStatus,
      detectedFace: detectedFace?.name || 'none',
      totalLogs: filteredLogs.length
    });
  }, [isCameraActive, videoStream, streamAttached, cameraStatus, detectedFace, filteredLogs.length]);

  return (
    <div>
      <header className="header-card">
        <h1>REAL-TIME MONITOR</h1>
        <p className="subtitle">Dashboard / Real-Time Monitor</p>
      </header>
      <hr className="header-divider" />

      <div className="rtm-wrapper">
        <div className="rtm-card">
          <div className="rtm-subheader">
            <div className="rtm-student-count">
              Students Inside: <span className="rtm-student-count-num">{studentsInside.toLocaleString()}</span>
            </div>
            <div className="rtm-filter-controls">
              <button
                className={`rtm-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={handleResetFilter}
              >
                All Logs ({filteredLogs.length})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'entrance' ? 'active' : ''}`}
                onClick={() => handleFilterChange('entrance')}
              >
                Entrance Only
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'exit' ? 'active' : ''}`}
                onClick={() => handleFilterChange('exit')}
              >
                Exit Only
              </button>
            </div>
          </div>

          <div className="rtm-body">
            <div className="rtm-left-panel">
              <div className="rtm-avatar-box">
                {isCameraActive && videoStream ? (
                  <>
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)',
                        WebkitTransform: 'scaleX(-1)',
                      }}
                      onLoadedMetadata={() => console.log("✅ Monitor Video: Ready")}
                      onError={(e) => console.error("❌ Monitor Video error:", e)}
                    />
                    {detectedFace && cameraStatus === "detected" && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(13, 51, 33, 0.95)',
                        color: '#00ff41',
                        padding: '10px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        zIndex: 10,
                        border: '1px solid #00ff41',
                        animation: 'slideUp 0.3s ease-out'
                      }}>
                        ✓ {detectedFace.name}
                      </div>
                    )}
                    {cameraStatus === "unauthorized" && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(255, 0, 0, 0.95)',
                        color: '#fff',
                        padding: '10px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        zIndex: 10,
                        border: '1px solid #ff0000',
                        animation: 'slideUp 0.3s ease-out'
                      }}>
                        ✗ UNAUTHORIZED
                      </div>
                    )}
                  </>
                ) : (
                  <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="38" r="24" stroke="#0d3321" strokeWidth="3" />
                    <path
                      d="M10 115c0-22 18-40 40-40s40 18 40 40"
                      stroke="#0d3321"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                <div className="rtm-corner tl" />
                <div className="rtm-corner tr" />
                <div className="rtm-corner bl" />
                <div className="rtm-corner br" />
                <div className="rtm-scan-line" />
              </div>
             
              <div className="rtm-status-text">
                {getStatusText().split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < getStatusText().split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>

            <div className="rtm-log-panel" ref={logRef}>
              {filteredLogs.length === 0 ? (
                <div className="rtm-empty-state">
                  No {activeFilter === 'entrance' ? 'entrance' : activeFilter === 'exit' ? 'exit' : ''} logs to display
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <LogEntry key={log.id || i} log={log} animDelay={i < 7 ? i * 0.06 : 0} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    
    </div>
  );
}