import { useState, useEffect, useRef } from "react";
import "../../css/RealTimeMonitor.css";
import '../../css/Monitor.css';
import { useLogContext } from "../../context/LogContext";
import { useCameraContext } from "../../context/CameraContext";
import { 
  exportLogsToXML, 
  downloadXML, 
  importLogsFromXML, 
  readXMLFile,
  downloadXSLT 
} from "../../utils/xmlUtils";

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
  const { logs: contextLogs, studentsInside, addLog, clearLogs } = useLogContext();
  const { 
    cameraStatus, 
    detectedFace, 
    isCameraActive, 
    videoStream,
    videoRef: contextVideoRef
  } = useCameraContext();
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const logRef = useRef(null);
  const localVideoRef = useRef(null);
  const [streamAttached, setStreamAttached] = useState(false);
  const fileInputRef = useRef(null);

  // Calculate counts for each filter
  const totalLogsCount = contextLogs.length;
  const entranceCount = contextLogs.filter(log => !log.failed && log.action === "ENTRY").length;
  const exitCount = contextLogs.filter(log => !log.failed && log.action === "EXIT").length;
  const failedCount = contextLogs.filter(log => log.failed).length;

  // Use the video stream from context
  useEffect(() => {
    if (localVideoRef.current && videoStream && !streamAttached) {
      try {
        console.log("Monitor: Attaching video stream from FaceRecognition");
        localVideoRef.current.srcObject = videoStream;
        setStreamAttached(true);
        
        // Apply mirror effect
        localVideoRef.current.style.transform = 'scaleX(-1)';
        localVideoRef.current.style.webkitTransform = 'scaleX(-1)';
        
        const playPromise = localVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log("Monitor: Video playing with mirror effect");
          }).catch((err) => {
            console.log("Video autoplay prevented:", err);
          });
        }
      } catch (err) {
        console.error("Error attaching stream:", err);
      }
    }
  }, [videoStream, streamAttached]);

  // Filter logs based on active filter and sort in ascending order (oldest first)
  useEffect(() => {
    let filtered = [];
    
    if (activeFilter === 'all') {
      filtered = [...contextLogs];
    } else if (activeFilter === 'entrance') {
      filtered = contextLogs.filter(log => !log.failed && log.action === "ENTRY");
    } else if (activeFilter === 'exit') {
      filtered = contextLogs.filter(log => !log.failed && log.action === "EXIT");
    } else if (activeFilter === 'failed') {
      filtered = contextLogs.filter(log => log.failed === true);
    }
    
    // Sort in ascending order (oldest first)
    const sortedFiltered = filtered.sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeA - timeB;
    });
    
    setFilteredLogs(sortedFiltered);
  }, [contextLogs, activeFilter]);

  // Auto-scroll to bottom when new log is added
  useEffect(() => {
    if (logRef.current && filteredLogs.length > 0) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  // Export logs to XML
  const exportToXML = () => {
    const xmlContent = exportLogsToXML(
      filteredLogs, 
      totalLogsCount, 
      studentsInside, 
      entranceCount, 
      exitCount, 
      failedCount,
      true
    );
    downloadXML(xmlContent);
  };

  // Export XSLT
  const exportXSLT = () => {
    downloadXSLT();
  };

  // Import XML file
  const importFromXML = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportError('');
    try {
      const xmlContent = await readXMLFile(file);
      const logs = await importLogsFromXML(xmlContent);
      setImportPreview(logs);
      setShowImportModal(true);
    } catch (err) {
      setImportError(`Error importing XML: ${err.message}`);
      console.error('Import error:', err);
    }
  };

  // Confirm import
  const confirmImport = () => {
    if (importPreview.length > 0) {
      // Add imported logs
      importPreview.forEach(log => {
        addLog(log);
      });
      
      setShowImportModal(false);
      setImportPreview([]);
      setImportError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Cancel import
  const cancelImport = () => {
    setShowImportModal(false);
    setImportPreview([]);
    setImportError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusText = () => {
    if (!isCameraActive) return 'Camera offline - Go to Face Recognition';
    if (cameraStatus === 'detected' && detectedFace) {
      return `RECOGNIZED\n${detectedFace.name}`;
    }
    if (cameraStatus === 'unauthorized') return 'UNAUTHORIZED';
    if (videoStream && streamAttached) return 'LIVE FEED ACTIVE';
    return 'Waiting for camera...';
  };

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
              Students Inside: <span className="rtm-student-count-num">{studentsInside}</span>
            </div>
            <div className="rtm-filter-controls">
              <button
                className={`rtm-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                All Logs ({totalLogsCount})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'entrance' ? 'active' : ''}`}
                onClick={() => handleFilterChange('entrance')}
              >
                Entrance Only ({entranceCount})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'exit' ? 'active' : ''}`}
                onClick={() => handleFilterChange('exit')}
              >
                Exit Only ({exitCount})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'failed' ? 'active' : ''}`}
                onClick={() => handleFilterChange('failed')}
              >
                Failed Attempts ({failedCount})
              </button>
            </div>

            {/* Export Buttons 
            <div style={{ 
              display: 'flex', 
              gap: '8px',
              marginLeft: 'auto'
            }}>
              <button
                onClick={exportToXML}
                className="rtm-filter-btn"
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white'
                }}
              >
                Export XML
              </button>
              <button
                onClick={exportXSLT}
                className="rtm-filter-btn"
                style={{
                  backgroundColor: '#FF9800',
                  color: 'white'
                }}
              >
                Download XSLT
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".xml"
                onChange={importFromXML}
                style={{ display: 'none' }}
                id="xml-import-input"
              />
              <button
                onClick={() => document.getElementById('xml-import-input').click()}
                className="rtm-filter-btn"
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white'
                }}
              >
                Import XML
              </button>
            </div>

            */}
          </div>

          <div className="rtm-body">
            {/* Log panel */}
            <div className="rtm-log-panel" ref={logRef}>
              {filteredLogs.length === 0 ? (
                <div className="rtm-empty-state">
                  No {activeFilter === 'entrance' ? 'entrance' : activeFilter === 'exit' ? 'exit' : activeFilter === 'failed' ? 'failed attempts' : ''} logs to display
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

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            padding: '20px',
            width: '80%',
            maxWidth: '600px',
            maxHeight: '80%',
            overflow: 'auto',
            border: '1px solid #00ff41'
          }}>
            <h3 style={{ color: '#00ff41', marginBottom: '15px' }}>Import XML Data</h3>
            <p>Found {importPreview.length} logs to import:</p>
            <div style={{
              maxHeight: '300px',
              overflow: 'auto',
              marginBottom: '20px',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '10px'
            }}>
              {importPreview.slice(0, 10).map((log, idx) => (
                <div key={idx} style={{
                  padding: '5px',
                  borderBottom: '1px solid #333',
                  fontSize: '12px'
                }}>
                  {log.failed ? (
                    <span style={{ color: '#ff4444' }}>Failed Attempt - {log.time}</span>
                  ) : (
                    <span style={{ color: '#00ff41' }}>{log.name} - {log.action} ({log.time})</span>
                  )}
                </div>
              ))}
              {importPreview.length > 10 && (
                <div style={{ padding: '5px', color: '#888' }}>
                  ... and {importPreview.length - 10} more
                </div>
              )}
            </div>
            {importError && (
              <div style={{ color: '#ff4444', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: '4px' }}>
                {importError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelImport}
                style={{
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Import {importPreview.length} Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}