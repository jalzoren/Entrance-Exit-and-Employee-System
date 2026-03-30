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

  // Load logs from localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedLogs = localStorage.getItem('entryExitLogs');
        const savedCount = localStorage.getItem('studentsInsideCount');
        
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          setLogs(parsedLogs);
          console.log(`📋 Loaded ${parsedLogs.length} logs from localStorage`);
        } else {
          // Initialize with some sample logs if needed
          console.log('No existing logs found, starting fresh');
        }
        
        if (savedCount) {
          const parsedCount = JSON.parse(savedCount);
          setStudentsInside(parsedCount);
          console.log(`📊 Loaded student count: ${parsedCount}`);
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
  }, []);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('entryExitLogs', JSON.stringify(logs));
      console.log(`💾 Saved ${logs.length} logs to localStorage`);
    }
  }, [logs, isInitialized]);

  // Save count to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('studentsInsideCount', JSON.stringify(studentsInside));
      console.log(`💾 Saved student count: ${studentsInside} to localStorage`);
    }
  }, [studentsInside, isInitialized]);

  // Calculate accurate student count based on logs
  const calculateStudentCount = useCallback((logEntries) => {
    let count = 0;
    // Process logs in chronological order
    const sortedLogs = [...logEntries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    for (const log of sortedLogs) {
      if (!log.failed) {
        if (log.action === "ENTRY" || log.action === "Entrance") {
          count++;
        } else if (log.action === "EXIT" || log.action === "Exit") {
          count = Math.max(0, count - 1);
        }
      }
    }
    return count;
  }, []);

  // Add a new log entry from face recognition
  const addLog = useCallback((logData) => {
    // Ensure action is properly formatted
    let action = logData.action;
    if (action === "Entrance") action = "ENTRY";
    if (action === "Exit") action = "EXIT";
    
    const newLog = {
      id: Date.now(),
      time: logData.time || new Date().toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }),
      name: logData.name || "Unknown",
      studentId: logData.studentId || "N/A",
      action: action, // "ENTRY" or "EXIT"
      method: logData.method || "FACE",
      failed: false,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
    };

    setLogs((prevLogs) => {
      const newLogs = [newLog, ...prevLogs];
      
      // Recalculate student count based on all logs
      const newCount = calculateStudentCount(newLogs);
      setStudentsInside(newCount);
      
      console.log(`✅ ${action} logged for ${logData.name} - New count: ${newCount}`);
      return newLogs;
    });

    return newLog;
  }, [calculateStudentCount]);

  // Add a failed authentication attempt
  const addFailedLog = useCallback(() => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }),
      failed: true,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      name: "Failed Attempt",
      studentId: "N/A",
      action: "FAILED",
      method: "FACE"
    };

    setLogs((prevLogs) => {
      const newLogs = [newLog, ...prevLogs];
      console.log(`❌ Failed authentication attempt logged`);
      return newLogs;
    });

    return newLog;
  }, []);

  // Get all logs
  const getAllLogs = useCallback(() => {
    return logs;
  }, [logs]);

  // Get filtered logs
  const getFilteredLogs = useCallback((filter = 'all') => {
    if (filter === 'entrance') {
      return logs.filter(log => !log.failed && (log.action === 'ENTRY' || log.action === 'Entrance'));
    } else if (filter === 'exit') {
      return logs.filter(log => !log.failed && (log.action === 'EXIT' || log.action === 'Exit'));
    } else if (filter === 'failed') {
      return logs.filter(log => log.failed === true);
    }
    return logs;
  }, [logs]);

  // Get logs by date range
  const getLogsByDateRange = useCallback((startDate, endDate) => {
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }, [logs]);

  // Get today's logs
  const getTodayLogs = useCallback(() => {
    const today = new Date().toLocaleDateString();
    return logs.filter(log => log.date === today);
  }, [logs]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    setStudentsInside(0);
    localStorage.removeItem('entryExitLogs');
    localStorage.removeItem('studentsInsideCount');
    console.log('🗑️ All logs cleared');
  }, []);

  // Reset students count (admin function)
  const resetStudentCount = useCallback((count = 0) => {
    setStudentsInside(count);
    console.log(`🔄 Student count reset to: ${count}`);
  }, []);

  // Sync student count with logs (recalculate)
  const syncStudentCount = useCallback(() => {
    const newCount = calculateStudentCount(logs);
    setStudentsInside(newCount);
    console.log(`🔄 Synced student count: ${newCount}`);
    return newCount;
  }, [logs, calculateStudentCount]);

  // Manual override for student count (for corrections)
  const overrideStudentCount = useCallback((newCount) => {
    if (typeof newCount === 'number' && newCount >= 0) {
      setStudentsInside(newCount);
      localStorage.setItem('studentsInsideCount', JSON.stringify(newCount));
      console.log(`🔧 Manually overrode student count to: ${newCount}`);
    }
  }, []);

  // Get statistics
  const getStatistics = useCallback(() => {
    const today = new Date().toLocaleDateString();
    const todayLogs = logs.filter(log => log.date === today);
    const todayEntries = todayLogs.filter(log => !log.failed && (log.action === 'ENTRY' || log.action === 'Entrance')).length;
    const todayExits = todayLogs.filter(log => !log.failed && (log.action === 'EXIT' || log.action === 'Exit')).length;
    const todayFailed = todayLogs.filter(log => log.failed).length;
    
    const totalEntries = logs.filter(log => !log.failed && (log.action === 'ENTRY' || log.action === 'Entrance')).length;
    const totalExits = logs.filter(log => !log.failed && (log.action === 'EXIT' || log.action === 'Exit')).length;
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
    logs,
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
    isInitialized
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export default LogContext;