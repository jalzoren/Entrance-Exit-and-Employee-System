import { useState, useEffect, useRef, useCallback } from "react";
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
import * as XLSX from 'xlsx';

function LogEntry({ log, animDelay }) {
  // Format student info display
  const getStudentInfo = () => {
    if (log.failed) {
      return <span className="rtm-log-name failed">Unknown Person</span>;
    }
    return (
      <>
        <span className="rtm-log-name">{log.name}</span>
        <span className="rtm-log-id">({log.studentId})</span>
        {log.collegeDept && log.collegeDept !== "Not Specified" && (
          <span className="rtm-log-dept"> - {log.collegeDept}</span>
        )}
        {log.yearLevel && log.yearLevel !== "Not Specified" && (
          <span className="rtm-log-year"> - {log.yearLevel}</span>
        )}
      </>
    );
  };

  return (
    <>
      {log.failed ? (
        <div className="rtm-log-entry failed" style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time}]</span> — Failed Authentication Attempt
          {log.name && log.name !== "Unknown" && (
            <span className="rtm-log-attempt"> (Attempted: {log.name})</span>
          )}
        </div>
      ) : (
        <div className={`rtm-log-entry success ${log.action.toLowerCase()}`} style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time}]</span>{" "}
          {getStudentInfo()}{" "}
          <span className={`rtm-log-action ${log.action.toLowerCase()}`}>
            {log.action === "ENTRY" ? "entered" : "exited"}
          </span>{" "}
          <span className="rtm-log-method">via {log.method}</span>
        </div>
      )}
      <div className="rtm-log-divider" />
    </>
  );
}

export default function Monitor() {
  const { 
    logs: contextLogs, 
    studentsInside, 
    addLog, 
    getAllLogs,
    getStatistics,
    getLogsByDateRange,
    syncStudentCount
  } = useLogContext();
  
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
  const [lastLogCount, setLastLogCount] = useState(0);
  const logRef = useRef(null);
  const localVideoRef = useRef(null);
  const [streamAttached, setStreamAttached] = useState(false);
  const fileInputRef = useRef(null);

  // Calculate counts for each filter
  const totalLogsCount = contextLogs.length;
  const entranceCount = contextLogs.filter(log => !log.failed && log.action === "ENTRY").length;
  const exitCount = contextLogs.filter(log => !log.failed && log.action === "EXIT").length;
  const failedCount = contextLogs.filter(log => log.failed).length;

  // Auto-sync function to check for new logs
  const syncLogs = useCallback(() => {
    const currentCount = contextLogs.length;
    if (currentCount !== lastLogCount) {
      setLastLogCount(currentCount);
      // Force refresh of filtered logs
      setFilteredLogs(prev => [...prev]);
      // Sync student count
      syncStudentCount();
    }
  }, [contextLogs.length, lastLogCount, syncStudentCount]);

  // Set up auto-refresh every 5 seconds
  useEffect(() => {
    // Initial sync
    syncLogs();
    
    // Set up interval to check for new logs every 5 seconds
    const intervalId = setInterval(() => {
      syncLogs();
      console.log("Auto-refreshing logs...");
    }, 5000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [syncLogs]);

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

  // Filter logs based on active filter and sort in ascending order (oldest first for display)
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
    
    // Sort in ascending order (oldest first) for natural reading flow
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

  // Export logs to Excel
  const exportToExcel = () => {
    // Prepare data for Excel
    const excelData = filteredLogs.map(log => ({
      'Date & Time': log.time,
      'Full Date': log.timestamp ? new Date(log.timestamp).toLocaleString() : log.date,
      'Name': log.failed ? 'Failed Attempt' : log.name,
      'Student ID': log.failed ? 'N/A' : log.studentId,
      'Department': log.collegeDept || 'N/A',
      'Year Level': log.yearLevel || 'N/A',
      'Action': log.failed ? 'FAILED' : log.action,
      'Method': log.method || 'N/A',
      'Status': log.failed ? 'Failed' : 'Success'
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-size columns (basic approach)
    const colWidths = [
      { wch: 15 }, // Date & Time
      { wch: 20 }, // Full Date
      { wch: 25 }, // Name
      { wch: 15 }, // Student ID
      { wch: 30 }, // Department
      { wch: 12 }, // Year Level
      { wch: 10 }, // Action
      { wch: 15 }, // Method
      { wch: 10 }  // Status
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entry-Exit Logs');

    // Add summary sheet
    const summaryData = [
      { 'Metric': 'Total Logs', 'Value': totalLogsCount },
      { 'Metric': 'Total Entries', 'Value': entranceCount },
      { 'Metric': 'Total Exits', 'Value': exitCount },
      { 'Metric': 'Failed Attempts', 'Value': failedCount },
      { 'Metric': 'Students Currently Inside', 'Value': studentsInside },
      { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() }
    ];
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Generate filename with current date
    const fileName = `entry_exit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, fileName);
  };

  // Export end of day report
  const exportEndOfDayReport = () => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const todayLogs = getLogsByDateRange(todayStart, todayEnd);
    
    if (todayLogs.length === 0) {
      alert('No logs recorded today to export.');
      return;
    }

    // Prepare end of day report data
    const reportData = todayLogs.map(log => ({
      'Time': log.time,
      'Date': log.date,
      'Name': log.failed ? 'Failed Attempt' : log.name,
      'Student ID': log.failed ? 'N/A' : log.studentId,
      'Department': log.collegeDept || 'N/A',
      'Year Level': log.yearLevel || 'N/A',
      'Action': log.failed ? 'FAILED' : log.action,
      'Method': log.method || 'N/A'
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(reportData);
    
    // Auto-size columns
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, 
      { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `End_of_Day_${new Date().toISOString().split('T')[0]}`);

    // Add daily summary
    const dailyEntries = todayLogs.filter(log => !log.failed && log.action === "ENTRY").length;
    const dailyExits = todayLogs.filter(log => !log.failed && log.action === "EXIT").length;
    const dailyFailed = todayLogs.filter(log => log.failed).length;

    const summaryData = [
      { 'Metric': 'Report Date', 'Value': new Date().toLocaleDateString() },
      { 'Metric': 'Total Logs Today', 'Value': todayLogs.length },
      { 'Metric': 'Entries Today', 'Value': dailyEntries },
      { 'Metric': 'Exits Today', 'Value': dailyExits },
      { 'Metric': 'Failed Attempts Today', 'Value': dailyFailed },
      { 'Metric': 'Net Change', 'Value': dailyEntries - dailyExits },
      { 'Metric': 'Students Inside (End of Day)', 'Value': studentsInside },
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
    ];
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily_Summary');

    // Download file
    const fileName = `end_of_day_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
      // Add imported logs in chronological order
      importPreview.forEach(log => {
        addLog(log);
      });
      
      setShowImportModal(false);
      setImportPreview([]);
      setImportError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Trigger a sync after import
      syncLogs();
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

  // Auto-refresh indicator
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      setLastRefresh(new Date());
    }, 5000);
    return () => clearInterval(refreshTimer);
  }, []);

  return (
    <div>
      <header className="header-card">
        <h1>REAL-TIME MONITOR</h1>
        <p className="subtitle">Dashboard / Real-Time Monitor</p>
      </header>

      <div className="rtm-wrapper">
        <div className="rtm-card">
          <div className="rtm-subheader">
            <div className="rtm-student-count">
              Students Currently Inside: <span className="rtm-student-count-num">{studentsInside}</span>
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

            {/* Export/Import Buttons - Corporate Design */}
            <div className="rtm-export-buttons">
              <button
                onClick={exportToExcel}
                className="rtm-filter-btn export-excel"
              >
                Export Excel
              </button>
              <button
                onClick={exportEndOfDayReport}
                className="rtm-filter-btn end-of-day"
              >
                End of Day Report
              </button>
              <button
                onClick={exportToXML}
                className="rtm-filter-btn export-xml"
              >
                Export XML
              </button>
              <button
                onClick={exportXSLT}
                className="rtm-filter-btn download-xslt"
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
                className="rtm-filter-btn import-xml"
              >
                Import XML
              </button>
            </div>
          </div>

          {/* Auto-refresh status indicator */}
          <div className="rtm-auto-refresh-status">
            <span className="refresh-indicator"></span>
            <span className="refresh-text">Auto-refreshing every 5 seconds</span>
            <span className="refresh-time">Last refresh: {lastRefresh.toLocaleTimeString()}</span>
          </div>

          <div className="rtm-body">
            {/* Log panel */}
            <div className="rtm-log-panel" ref={logRef}>
              {filteredLogs.length === 0 ? (
                <div className="rtm-empty-state">
                  {activeFilter === 'entrance' ? 'No entrance records yet' : 
                   activeFilter === 'exit' ? 'No exit records yet' : 
                   activeFilter === 'failed' ? 'No failed attempts recorded' : 
                   'No activity logs to display'}
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
        <div className="rtm-modal-overlay">
          <div className="rtm-modal-content">
            <h3>Import XML Data</h3>
            <p>Found {importPreview.length} logs to import:</p>
            <div className="rtm-modal-preview">
              {importPreview.slice(0, 10).map((log, idx) => (
                <div key={idx} className="rtm-modal-preview-item">
                  {log.failed ? (
                    <span style={{ color: '#ff4444' }}>Failed Attempt - {log.time}</span>
                  ) : (
                    <span>
                      {log.name} - {log.action} ({log.time})
                      {log.collegeDept && log.collegeDept !== "Not Specified" && ` - ${log.collegeDept}`}
                      {log.yearLevel && log.yearLevel !== "Not Specified" && ` - ${log.yearLevel}`}
                    </span>
                  )}
                </div>
              ))}
              {importPreview.length > 10 && (
                <div className="rtm-modal-more">
                  ... and {importPreview.length - 10} more
                </div>
              )}
            </div>
            {importError && (
              <div className="rtm-modal-error">
                {importError}
              </div>
            )}
            <div className="rtm-modal-buttons">
              <button onClick={cancelImport} className="rtm-modal-cancel">
                Cancel
              </button>
              <button onClick={confirmImport} className="rtm-modal-confirm">
                Import {importPreview.length} Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}