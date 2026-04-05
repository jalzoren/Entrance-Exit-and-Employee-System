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
  const [isInitialized, setIsInitialized] = useState(false);

  // Calculate accurate student count based on logs (chronological order)
  const calculateStudentCount = useCallback((logEntries) => {
    let count = 0;
    // Sort logs in chronological order (oldest first) for calculation
    const sortedLogs = [...logEntries].sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeA - timeB;
    });
    
    for (const log of sortedLogs) {
      if (!log.failed) {
        if (log.action === "ENTRY") {
          count++;
        } else if (log.action === "EXIT") {
          count = Math.max(0, count - 1);
        }
      }
    }
    return count;
  }, []);

  // Load logs from localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedLogs = localStorage.getItem('entryExitLogs');
        const savedCount = localStorage.getItem('studentsInsideCount');
        
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          // Store in ascending order internally, but provide descending for display
          setLogs(parsedLogs);
          console.log(`📋 Loaded ${parsedLogs.length} logs from localStorage`);
        } else {
          console.log('No existing logs found, starting fresh');
          setLogs([]);
        }
        
        if (savedCount) {
          const parsedCount = JSON.parse(savedCount);
          setStudentsInside(parsedCount);
        } else if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          const newCount = calculateStudentCount(parsedLogs);
          setStudentsInside(newCount);
        } else {
          setStudentsInside(0);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading logs from localStorage:', error);
        setIsInitialized(true);
      }
    };
    
    loadData();
  }, [calculateStudentCount]);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('entryExitLogs', JSON.stringify(logs));
    }
  }, [logs, isInitialized]);

  // Save count to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('studentsInsideCount', JSON.stringify(studentsInside));
    }
  }, [studentsInside, isInitialized]);

  // Add a new log entry from face recognition
  const addLog = useCallback((logData) => {
    // Normalize action to uppercase
    let action = logData.action;
    if (action === "Entrance") action = "ENTRY";
    if (action === "Exit") action = "EXIT";
    if (action !== "ENTRY" && action !== "EXIT") {
      console.error(`Invalid action: ${action}`);
      return null;
    }
    
    const now = new Date();
    const newLog = {
      id: Date.now(),
      time: logData.time || now.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }),
      name: logData.name || "Unknown",
      studentId: logData.studentId || "N/A",
      action: action,
      method: logData.method || "FACE",
      failed: false,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString(),
    };

    setLogs((prevLogs) => {
      // Add new log to the end (ascending order internally)
      const newLogs = [...prevLogs, newLog];
      const newCount = calculateStudentCount(newLogs);
      setStudentsInside(newCount);
      console.log(`✅ ${action} logged for ${logData.name}`);
      return newLogs;
    });

    return newLog;
  }, [calculateStudentCount]);

  // Add a failed authentication attempt
  const addFailedLog = useCallback(() => {
    const now = new Date();
    const newLog = {
      id: Date.now(),
      time: now.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }),
      failed: true,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString(),
      name: "Unknown",
      studentId: "N/A",
      action: "FAILED",
      method: "FACE"
    };

    setLogs((prevLogs) => {
      const newLogs = [...prevLogs, newLog];
      console.log(`❌ Failed authentication attempt logged at ${newLog.time}`);
      return newLogs;
    });

    return newLog;
  }, []);

  // Get logs for display - DESCENDING order (newest first)
  const getDisplayLogs = useCallback(() => {
    return [...logs].sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeB - timeA; // Descending - newest first
    });
  }, [logs]);

  // Get filtered logs for display - DESCENDING order
  const getFilteredLogs = useCallback((filter = 'all') => {
    let filtered;
    if (filter === 'entrance') {
      filtered = logs.filter(log => !log.failed && log.action === 'ENTRY');
    } else if (filter === 'exit') {
      filtered = logs.filter(log => !log.failed && log.action === 'EXIT');
    } else if (filter === 'failed') {
      filtered = logs.filter(log => log.failed === true);
    } else {
      filtered = logs;
    }
    // Return in descending order (newest first)
    return [...filtered].sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeB - timeA;
    });
  }, [logs]);

  // Get all logs in chronological order (oldest first - for calculation)
  const getAllLogs = useCallback(() => {
    return [...logs].sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeA - timeB;
    });
  }, [logs]);

  // Get logs by date range
  const getLogsByDateRange = useCallback((startDate, endDate) => {
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    }).sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeB - timeA;
    });
  }, [logs]);

  // Get today's logs
  const getTodayLogs = useCallback(() => {
    const today = new Date().toLocaleDateString();
    return logs.filter(log => log.date === today).sort((a, b) => {
      const timeA = a.timestamp || new Date(a.time).getTime();
      const timeB = b.timestamp || new Date(b.time).getTime();
      return timeB - timeA;
    });
  }, [logs]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    setStudentsInside(0);
    localStorage.removeItem('entryExitLogs');
    localStorage.removeItem('studentsInsideCount');
    console.log('🗑️ All logs cleared');
  }, []);

  // Reset students count
  const resetStudentCount = useCallback((count = 0) => {
    setStudentsInside(count);
  }, []);

  // Sync student count with logs
  const syncStudentCount = useCallback(() => {
    const newCount = calculateStudentCount(logs);
    setStudentsInside(newCount);
    return newCount;
  }, [logs, calculateStudentCount]);

  // Manual override for student count
  const overrideStudentCount = useCallback((newCount) => {
    if (typeof newCount === 'number' && newCount >= 0) {
      setStudentsInside(newCount);
      localStorage.setItem('studentsInsideCount', JSON.stringify(newCount));
    }
  }, []);

  // Get statistics
  const getStatistics = useCallback(() => {
    const today = new Date().toLocaleDateString();
    const todayLogs = logs.filter(log => log.date === today);
    const todayEntries = todayLogs.filter(log => !log.failed && log.action === 'ENTRY').length;
    const todayExits = todayLogs.filter(log => !log.failed && log.action === 'EXIT').length;
    const todayFailed = todayLogs.filter(log => log.failed).length;
    
    const totalEntries = logs.filter(log => !log.failed && log.action === 'ENTRY').length;
    const totalExits = logs.filter(log => !log.failed && log.action === 'EXIT').length;
    const totalFailed = logs.filter(log => log.failed).length;
    
    return {
      today: {
        entries: todayEntries,
        exits: todayExits,
        failed: todayFailed,
        total: todayLogs.length
      },
      total: {
        entries: totalEntries,
        exits: totalExits,
        failed: totalFailed,
        logs: logs.length
      },
      currentStudents: studentsInside
    };
  }, [logs, studentsInside]);

  const value = {
    logs: getDisplayLogs(), // Provide logs in descending order (newest first)
    studentsInside,
    addLog,
    addFailedLog,
    getAllLogs,
    getFilteredLogs,
    getLogsByDateRange,
    getTodayLogs,
    clearLogs,
    resetStudentCount,
    syncStudentCount,
    overrideStudentCount,
    getStatistics,
    setStudentsInside,
    isInitialized,
    getDisplayLogs
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export default LogContext;