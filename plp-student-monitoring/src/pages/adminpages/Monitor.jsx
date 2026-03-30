import { useState, useEffect, useRef } from "react";
import "../../css/RealTimeMonitor.css";
import '../../css/Monitor.css';
import { useLogContext } from "../../context/LogContext";

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
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'entrance', 'exit'
  const [filteredLogs, setFilteredLogs] = useState([]);
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
      setFilteredLogs(contextLogs);
    } else if (activeFilter === 'entrance') {
      setFilteredLogs(contextLogs.filter(log => !log.failed && log.action === "ENTRY"));
    } else if (activeFilter === 'exit') {
      setFilteredLogs(contextLogs.filter(log => !log.failed && log.action === "EXIT"));
    }
  }, [contextLogs, activeFilter]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    
    // Remove the active button highlight after 300ms
    setTimeout(() => {
      if (filter === 'all') {
        setActiveFilter('all');
      }
    }, 300);
  };

  const handleResetFilter = () => {
    setActiveFilter('all');
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
            <div className="rtm-student-count">Students Inside: <span className="rtm-student-count-num">{studentsInside.toLocaleString()}</span></div>
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