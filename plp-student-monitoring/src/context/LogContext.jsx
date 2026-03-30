import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LogContext = createContext();

export const useLogContext = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogContext must be used within a LogProvider');
  }
  return context;
};

export const LogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [studentsInside, setStudentsInside] = useState(0);

  // Load logs from localStorage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('entryExitLogs');
    const savedCount = localStorage.getItem('studentsInsideCount');
    
    if (savedLogs) {
      try {
        const parsedLogs = JSON.parse(savedLogs);
        setLogs(parsedLogs);
      } catch (error) {
        console.error('Error loading logs from localStorage:', error);
      }
    }
    
    if (savedCount) {
      try {
        const parsedCount = JSON.parse(savedCount);
        setStudentsInside(parsedCount);
      } catch (error) {
        console.error('Error loading count from localStorage:', error);
      }
    }
  }, []);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('entryExitLogs', JSON.stringify(logs));
  }, [logs]);

  // Save count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('studentsInsideCount', JSON.stringify(studentsInside));
  }, [studentsInside]);

  // Add a new log entry from face recognition
  const addLog = useCallback((logData) => {
    const newLog = {
      id: Date.now(),
      time: logData.time || new Date().toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
      name: logData.name,
      studentId: logData.studentId,
      action: logData.action, // "ENTRY" or "EXIT"
      method: logData.method || "FACE",
      failed: false,
      timestamp: new Date().toISOString(),
    };

    setLogs((prevLogs) => [newLog, ...prevLogs]);

    // Update students count
    setStudentsInside((prev) => {
      const newCount = logData.action === "ENTRY" ? prev + 1 : Math.max(0, prev - 1);
      return newCount;
    });

    return newLog;
  }, []);

  // Add a failed authentication attempt
  const addFailedLog = useCallback(() => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
      failed: true,
      timestamp: new Date().toISOString(),
    };

    setLogs((prevLogs) => [newLog, ...prevLogs]);

    return newLog;
  }, []);

  // Get all logs
  const getAllLogs = useCallback(() => {
    return logs;
  }, [logs]);

  // Get filtered logs
  const getFilteredLogs = useCallback((filter = 'all') => {
    if (filter === 'entry') {
      return logs.filter(log => !log.failed && log.action === 'ENTRY');
    } else if (filter === 'exit') {
      return logs.filter(log => !log.failed && log.action === 'EXIT');
    }
    return logs;
  }, [logs]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    setStudentsInside(0);
    localStorage.removeItem('entryExitLogs');
    localStorage.removeItem('studentsInsideCount');
  }, []);

  // Reset students count
  const resetStudentCount = useCallback((count = 0) => {
    setStudentsInside(count);
  }, []);

  const value = {
    logs,
    studentsInside,
    addLog,
    addFailedLog,
    getAllLogs,
    getFilteredLogs,
    clearLogs,
    resetStudentCount,
    setStudentsInside,
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export default LogContext;
