import { useState, useEffect, useRef } from "react";
import "../css/RealTimeMonitor.css";
import '../css/Monitor.css';

const initialLogs = [
  { id: 1, time: "07:59 AM", name: "BITANCOR, JERIMIAH A.",      studentId: "23-00198", action: "ENTRY", method: "FACE",      failed: false },
  { id: 2, time: "07:55 AM", name: "ALPUERTO, LYNN CZYLA M.",    studentId: "23-00170", action: "ENTRY", method: "MANUAL ID", failed: false },
  { id: 3, time: "08:00 AM", failed: true },
  { id: 4, time: "08:02 AM", name: "CASTILLON, BIANCA RAIN C.",  studentId: "23-00190", action: "ENTRY", method: "FACE",      failed: false },
  { id: 5, time: "08:10 AM", name: "FLAVIER, LAURENCE JAMES L.", studentId: "23-00170", action: "ENTRY", method: "MANUAL ID", failed: false },
  { id: 6, time: "08:11 AM", name: "ONRUBIA, NEIL ADRIAN N.",    studentId: "23-00170", action: "ENTRY", method: "MANUAL ID", failed: false },
  { id: 7, time: "08:12 AM", failed: true },
  { id: 8, time: "08:15 AM", name: "BITANCOR, JERIMIAH A.",      studentId: "23-00198", action: "EXIT", method: "FACE",      failed: false },
  { id: 9, time: "08:20 AM", name: "ALPUERTO, LYNN CZYLA M.",    studentId: "23-00170", action: "EXIT", method: "MANUAL ID", failed: false },
];

// Student list from initial logs (excluding failed attempts)
const STUDENTS = initialLogs
  .filter(log => !log.failed)
  .map(log => ({
    name: log.name,
    studentId: log.studentId
  }));

// Remove duplicates (in case same student appears multiple times)
const UNIQUE_STUDENTS = STUDENTS.filter((student, index, self) =>
  index === self.findIndex(s => s.studentId === student.studentId)
);
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
  const [logs, setLogs] = useState(initialLogs);
  const [filteredLogs, setFilteredLogs] = useState(initialLogs);
  const [count, setCount] = useState(1000);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'entrance', 'exit'
  const [activeBtn, setActiveBtn] = useState(null);
  const logRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  // Apply filter whenever logs or activeFilter changes
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredLogs(logs);
    } else if (activeFilter === 'entrance') {
      setFilteredLogs(logs.filter(log => !log.failed && log.action === "ENTRY"));
    } else if (activeFilter === 'exit') {
      setFilteredLogs(logs.filter(log => !log.failed && log.action === "EXIT"));
    }
  }, [logs, activeFilter]);

  // Automatically add new logs every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // 80% chance of success, 20% chance of failure
      const isFailed = Math.random() < 0.2;
      
      if (isFailed) {
        // Add failed attempt
        const newLog = {
          id: Date.now(),
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          failed: true
        };
        setLogs((prev) => [...prev, newLog]);
      } else {
        // Randomly select a student from the unique students list
        const randomStudent = UNIQUE_STUDENTS[Math.floor(Math.random() * UNIQUE_STUDENTS.length)];
        
        // Randomly determine if it's ENTRY or EXIT (50/50 chance)
        const action = Math.random() > 0.5 ? "ENTRY" : "EXIT";
        
        // Random method (70% FACE, 30% MANUAL ID)
        const method = Math.random() > 0.3 ? "FACE" : "MANUAL ID";
        
        const newLog = {
          id: Date.now(),
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          name: randomStudent.name,
          studentId: randomStudent.studentId,
          action: action,
          method: method,
          failed: false
        };
        
        setLogs((prev) => [...prev, newLog]);
        
        // Update count based on action
        setCount((c) => action === "ENTRY" ? c + 1 : Math.max(0, c - 1));
      }
    }, 10000); // Add new log every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setActiveBtn(filter === 'entrance' ? 'entrance' : filter === 'exit' ? 'exit' : null);
    
    // Remove the active button highlight after 300ms
    setTimeout(() => {
      if (filter === 'all') {
        setActiveBtn(null);
      }
    }, 300);
  };

  const handleResetFilter = () => {
    setActiveFilter('all');
    setActiveBtn(null);
  };

  return (
    <div>
      <header className="header-card">
        <h1>REAL-TIME MONITOR</h1>
        <p className="subtitle">Dashboard / Real-Time Monitor</p>
      </header>
      <hr className="header-divider" />

      {/* Monitor content */}
      <div className="rtm-wrapper">
        <div className="rtm-card">

          {/* Student count and filter controls */}
          <div className="rtm-subheader">
            <div className="rtm-student-count">Students Inside: <span className="rtm-student-count-num">{count.toLocaleString()}</span></div>
            <div className="rtm-filter-controls">
              <button
                className={`rtm-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={handleResetFilter}
              >
                All Logs
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

          {/* Avatar panel (left) + log panel (right) */}
          <div className="rtm-body">

            <div className="rtm-left-panel">
              <div className="rtm-avatar-box">
                <div className="rtm-corner tl" />
                <div className="rtm-corner tr" />
                <div className="rtm-corner bl" />
                <div className="rtm-corner br" />
                <div className="rtm-scan-line" />
                <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="38" r="24" stroke="#0d3321" strokeWidth="3" />
                  <path
                    d="M10 115c0-22 18-40 40-40s40 18 40 40"
                    stroke="#0d3321"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="rtm-status-text">
                {activeFilter === 'all' ? 'Showing all logs' : 
                 activeFilter === 'entrance' ? 'Showing only ENTRANCE logs' : 
                 'Showing only EXIT logs'}
              </div>
           
            </div>

            <div className="rtm-log-panel" ref={logRef}>
              {filteredLogs.length === 0 ? (
                <div className="rtm-empty-state">
                  No {activeFilter === 'entrance' ? 'entrance' : activeFilter === 'exit' ? 'exit' : ''} logs to display
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <LogEntry key={log.id} log={log} animDelay={i < 7 ? i * 0.06 : 0} />
                ))
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}