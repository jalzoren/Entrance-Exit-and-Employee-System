import { useState, useEffect, useRef, useCallback } from "react";
import "../../css/RealTimeMonitor.css";
import '../../css/Monitor.css';
import { useLogContext } from "../../context/LogContext";
import { useCameraContext } from "../../context/CameraContext";
import { 
  exportLogsToXML, 
  downloadXML
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

function StudentsInsideModal({ isOpen, onClose, studentsInsideList, studentsCount }) {
  if (!isOpen) return null;

  return (
    <div className="rtm-modal-overlay" onClick={onClose}>
      <div className="rtm-modal-content students-inside-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Students Currently Inside Campus</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="students-count-badge">
            Total Students Inside: <span className="count-number">{studentsCount}</span>
          </div>
          {studentsInsideList.length === 0 ? (
            <div className="no-students-message">
              No students currently inside the campus.
            </div>
          ) : (
            <div className="students-table-container">
              <table className="students-inside-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Year Level</th>
                    <th>Entry Time</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsInsideList.map((student, index) => (
                    <tr key={student.studentId}>
                      <td>{index + 1}</td>
                      <td>{student.studentId}</td>
                      <td>{student.name}</td>
                      <td>{student.department || 'N/A'}</td>
                      <td>{student.yearLevel || 'N/A'}</td>
                      <td>{student.entryTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
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
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [studentsInsideList, setStudentsInsideList] = useState([]);
  const [lastLogCount, setLastLogCount] = useState(0);
  const logRef = useRef(null);
  const localVideoRef = useRef(null);
  const [streamAttached, setStreamAttached] = useState(false);

  // Calculate counts for each filter
  const totalLogsCount = contextLogs.length;
  const entranceCount = contextLogs.filter(log => !log.failed && log.action === "ENTRY").length;
  const exitCount = contextLogs.filter(log => !log.failed && log.action === "EXIT").length;
  const failedCount = contextLogs.filter(log => log.failed).length;

  // Calculate students currently inside based on logs
  const calculateStudentsInside = useCallback(() => {
    const insideMap = new Map();
    const sortedLogs = [...contextLogs].sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeA - timeB;
    });

    for (const log of sortedLogs) {
      if (!log.failed) {
        if (log.action === "ENTRY") {
          insideMap.set(log.studentId, {
            studentId: log.studentId,
            name: log.name,
            department: log.collegeDept,
            yearLevel: log.yearLevel,
            entryTime: log.time,
            entryTimestamp: log.timestamp
          });
        } else if (log.action === "EXIT") {
          insideMap.delete(log.studentId);
        }
      }
    }

    return Array.from(insideMap.values());
  }, [contextLogs]);

  // Update students inside list when logs change
  useEffect(() => {
    const inside = calculateStudentsInside();
    setStudentsInsideList(inside);
  }, [contextLogs, calculateStudentsInside]);

  // Auto-sync function to check for new logs
  const syncLogs = useCallback(() => {
    const currentCount = contextLogs.length;
    if (currentCount !== lastLogCount) {
      setLastLogCount(currentCount);
      setFilteredLogs(prev => [...prev]);
      syncStudentCount();
    }
  }, [contextLogs.length, lastLogCount, syncStudentCount]);

  // Set up auto-refresh every 5 seconds
  useEffect(() => {
    syncLogs();
    
    const intervalId = setInterval(() => {
      syncLogs();
      console.log("Auto-refreshing logs...");
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [syncLogs]);

  // Use the video stream from context
  useEffect(() => {
    if (localVideoRef.current && videoStream && !streamAttached) {
      try {
        console.log("Monitor: Attaching video stream from FaceRecognition");
        localVideoRef.current.srcObject = videoStream;
        setStreamAttached(true);
        
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

  // Filter logs based on active filter
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

    const ws = XLSX.utils.json_to_sheet(excelData);
    const colWidths = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, 
      { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entry-Exit Logs');

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

    const fileName = `entry_exit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
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

    const ws = XLSX.utils.json_to_sheet(reportData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, 
      { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `End_of_Day_${new Date().toISOString().split('T')[0]}`);

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
          {/* Horizontal subheader */}
          <div className="rtm-subheader-horizontal">
            <div className="rtm-student-count">
              Students Currently Inside: 
              <span className="rtm-student-count-num">{studentsInside}</span>
              <button 
                className="view-students-btn"
                onClick={() => setShowStudentsModal(true)}
              >
                View List
              </button>
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

      {/* Students Inside Modal */}
      <StudentsInsideModal 
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        studentsInsideList={studentsInsideList}
        studentsCount={studentsInsideList.length}
      />
    </div>
  );
}