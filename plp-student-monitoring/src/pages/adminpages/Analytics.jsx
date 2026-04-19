import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../../css/Analytics.css';
import GenerateReportFilter from '../../components/GenerateReportFilter';
import GenerateReportPdf from '../../components/GenerateReportPdf';
import { useLogContext } from '../../context/LogContext';

const AUTH_COLORS = ['#01311d', '#d99201'];

// College/Department name mapping for consistent display
const COLLEGE_ABBREVIATIONS = {
  'College of Computer Studies': 'CCS',
  'College of Nursing': 'CON',
  'College of Engineering': 'COE',
  'College of Arts and Sciences': 'CAS',
  'College of Arts and Science': 'CAS',
  'College of Business and Accountancy': 'CBA',
  'College of Education': 'CCED',
  'College of International Hospitality Management': 'CHIM',
  'College of Hospitality Management': 'CHIM',
  'General': 'GEN'
};

const getCollegeName = (department) => {
  return COLLEGE_ABBREVIATIONS[department] || department.substring(0, 15).toUpperCase();
};

function Analytics() {
  const { logs, studentsInside } = useLogContext();
  
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    currentStudentsInside: 0,
  });
  const [trafficData, setTrafficData] = useState([]);
  const [collegeData, setCollegeData] = useState([]);
  const [authData, setAuthData] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');
  
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [filteredReportData, setFilteredReportData] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  
  const pdfRef = useRef(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentCollegeData = collegeData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(collegeData.length / recordsPerPage);

  // Helper function to get date range based on time range selection
  const getDateRange = (range) => {
    const now = new Date();
    const startDate = new Date();
    
    if (range === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '1year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    return { startDate, endDate: now };
  };

  // Helper function to generate traffic data from logs
  const generateTrafficData = React.useCallback((range) => {
    const { startDate, endDate } = getDateRange(range);
    const trafficMap = new Map();
    
    // Initialize dates
    if (range === '7days') {
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dayName = daysOfWeek[date.getDay()];
        trafficMap.set(dayName, { entrance: 0, exit: 0 });
      }
    } else if (range === '30days') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        trafficMap.set(dateStr, { entrance: 0, exit: 0 });
      }
    } else if (range === '1year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(month => {
        trafficMap.set(month, { entrance: 0, exit: 0 });
      });
    }
    
    // Count entries and exits
    logs.forEach(log => {
      if (!log.failed && log.timestamp) {
        const logDate = new Date(log.timestamp);
        if (logDate >= startDate && logDate <= endDate) {
          let dateKey;
          
          if (range === '7days') {
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dateKey = daysOfWeek[logDate.getDay()];
          } else if (range === '30days') {
            dateKey = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (range === '1year') {
            dateKey = logDate.toLocaleDateString('en-US', { month: 'short' });
          }
          
          if (trafficMap.has(dateKey)) {
            const data = trafficMap.get(dateKey);
            if (log.action === 'ENTRY') {
              data.entrance++;
            } else if (log.action === 'EXIT') {
              data.exit++;
            }
          }
        }
      }
    });
    
    return Array.from(trafficMap, ([date, data]) => ({ date, ...data }));
  }, [logs]);

  // Helper function to generate college distribution from logs
  const generateCollegeData = React.useCallback(() => {
    const collegeMap = new Map();
    
    logs.forEach(log => {
      if (!log.failed) {
        // Use actual department from log, exclude 'General' or empty entries
        const college = log.collegeDept && log.collegeDept.trim() && log.collegeDept !== 'General' 
          ? log.collegeDept 
          : null;
        
        // Only count entries with actual department data
        if (college) {
          if (collegeMap.has(college)) {
            collegeMap.set(college, collegeMap.get(college) + 1);
          } else {
            collegeMap.set(college, 1);
          }
        }
      }
    });
    
    const totalRecords = Array.from(collegeMap.values()).reduce((sum, count) => sum + count, 0);
    
    return Array.from(collegeMap, ([fullCollegeName, presenceNow], id) => ({
      id: id + 1,
      collegeName: getCollegeName(fullCollegeName),
      fullCollegeName: fullCollegeName,
      presenceNow,
      totalStudents: presenceNow * 2, // Estimated total based on current presence
      percentage: totalRecords > 0 ? Math.round((presenceNow / totalRecords) * 100) : 0,
    })).sort((a, b) => b.presenceNow - a.presenceNow);
  }, [logs]);

  // Helper function to generate authentication data from logs
  const generateAuthData = React.useCallback(() => {
    let faceCount = 0;
    let manualCount = 0;
    let totalCount = 0;

    logs.forEach(log => {
      if (!log.failed) {
        totalCount++;
        if (log.method === 'FACE') {
          faceCount++;
        } else if (log.method === 'MANUAL') {
          manualCount++;
        }
      }
    });

    const faceRate = totalCount > 0 ? Math.round((faceCount / totalCount) * 100) : 0;
    const manualRate = totalCount > 0 ? Math.round((manualCount / totalCount) * 100) : 0;

    return [
      { 
        id: 1, 
        method: 'Facial Recognition', 
        attempts: faceCount, 
        success: faceCount, 
        successRate: `${faceRate}%` 
      },
      { 
        id: 2, 
        method: 'Manual Input', 
        attempts: manualCount, 
        success: manualCount, 
        successRate: `${manualRate}%` 
      },
    ].filter(auth => auth.attempts > 0);
  }, [logs]);

  // Calculate total unique students
  const totalUniqueStudents = useMemo(() => {
    const studentSet = new Set();
    logs.forEach(log => {
      if (!log.failed && log.studentId && log.studentId !== 'N/A') {
        studentSet.add(log.studentId);
      }
    });
    return studentSet.size;
  }, [logs]);

  // Update analytics data when logs or time range changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay for better UX
      setTimeout(() => {
        setMetrics({
          totalStudents: totalUniqueStudents || logs.length,
          currentStudentsInside: studentsInside,
        });
        
        setTrafficData(generateTrafficData(timeRange));
        setCollegeData(generateCollegeData());
        setAuthData(generateAuthData());
        setIsLoading(false);
      }, 300);
    } catch (err) {
      console.error('Error calculating analytics:', err);
      setError('Failed to calculate analytics data');
      setIsLoading(false);
    }
  }, [logs, timeRange, studentsInside, totalUniqueStudents, generateTrafficData, generateCollegeData, generateAuthData]);

  // Handle apply filters from the filter popup
  const handleApplyFilters = (filters) => {
    console.log('Filters applied:', filters);
    setAppliedFilters(filters);
    
    // Filter logs based on applied filters
    let filteredLogs = logs.filter(log => !log.failed);
    
    if (filters.dateRange?.from && filters.dateRange?.to) {
      const fromDate = new Date(filters.dateRange.from.split('/').reverse().join('-'));
      const toDate = new Date(filters.dateRange.to.split('/').reverse().join('-'));
      toDate.setHours(23, 59, 59);
      
      filteredLogs = filteredLogs.filter(log => {
        if (!log.timestamp) return false;
        const logDate = new Date(log.timestamp);
        return logDate >= fromDate && logDate <= toDate;
      });
    }
    
    if (filters.collegeDepartment) {
      filteredLogs = filteredLogs.filter(log => log.collegeDept === filters.collegeDepartment);
    }
    
    // Calculate college distribution from filtered logs
    const collegeMap = new Map();
    filteredLogs.forEach(log => {
      // Use actual department from log, exclude 'General' or empty entries
      const college = log.collegeDept && log.collegeDept.trim() && log.collegeDept !== 'General'
        ? log.collegeDept
        : null;
      
      // Only count entries with actual department data
      if (college) {
        collegeMap.set(college, (collegeMap.get(college) || 0) + 1);
      }
    });
    
    // Calculate total based only on records with actual departments
    const totalWithDept = Array.from(collegeMap.values()).reduce((sum, count) => sum + count, 0);
    
    const collegeDataForPdf = Array.from(collegeMap, ([fullName, count]) => ({
      name: getCollegeName(fullName),
      fullName: fullName,
      count,
      percentage: totalWithDept > 0 ? Math.round((count / totalWithDept) * 100) : 0
    })).sort((a, b) => b.count - a.count);
    
    // Calculate method distribution
    const methodMap = new Map();
    filteredLogs.forEach(log => {
      const method = log.method === 'FACE' ? 'Face Recognition' : 'Manual Input';
      methodMap.set(method, (methodMap.get(method) || 0) + 1);
    });
    
    const methodDataForPdf = Array.from(methodMap, ([name, count]) => ({
      name,
      percentage: filteredLogs.length > 0 ? Math.round((count / filteredLogs.length) * 100) : 0,
      count,
      total: filteredLogs.length
    }));
    
    // Calculate traffic summary
    const trafficChartData = trafficData.length > 0 ? trafficData : [];
    const trafficDataForPdf = {
      highest: trafficChartData.length > 0 
        ? `${trafficChartData.reduce((max, day) => day.entrance > max.entrance ? day : max).date} (${trafficChartData.reduce((max, day) => day.entrance > max.entrance ? day : max).entrance.toLocaleString()} entries)`
        : 'N/A',
      lowest: trafficChartData.length > 0 
        ? `${trafficChartData.reduce((min, day) => day.entrance < min.entrance ? day : min).date} (${trafficChartData.reduce((min, day) => day.entrance < min.entrance ? day : min).entrance.toLocaleString()} entries)`
        : 'N/A',
      peakHour: 'Calculated from logs'
    };
    
    const successDataForPdf = authData.map(auth => ({
      method: auth.method,
      attempts: auth.attempts,
      successRate: parseInt(auth.successRate),
      successCount: auth.success
    }));
    
    // Calculate unique students
    const uniqueStudents = new Set();
    filteredLogs.forEach(log => {
      if (log.studentId && log.studentId !== 'N/A') {
        uniqueStudents.add(log.studentId);
      }
    });
    
    // Student logs for table
    const studentLogs = filteredLogs.map((log, index) => ({
      no: index + 1,
      dateTime: new Date(log.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      studentId: log.studentId,
      name: log.name,
      department: log.collegeDept || 'N/A',
      action: log.action === 'ENTRY' ? 'Entrance' : 'Exit',
      method: log.method === 'FACE' ? 'Face Recognition' : 'Manual Input'
    }));
    
    // Prepare filtered data for report
    const filteredData = {
      totalStudents: uniqueStudents.size,
      totalCapacity: metrics.totalStudents,
      dateRange: filters.dateRange?.from && filters.dateRange?.to 
        ? `${filters.dateRange.from} - ${filters.dateRange.to}`
        : 'All Time',
      collegeData: collegeDataForPdf,
      methodData: methodDataForPdf,
      successData: successDataForPdf,
      trafficData: trafficDataForPdf,
      trafficChartData: trafficChartData,
      studentLogs: studentLogs,
      filters
    };
    
    setFilteredReportData(filteredData);
    setShowPdfPreview(true);
  };

  // Handle PDF download
  const handleDownloadPDF = () => {
    if (pdfRef.current) {
      pdfRef.current.generatePDF();
    }
  };

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    setFilteredReportData(null);
  };

  const getTrafficInsights = () => {
    if (!trafficData || trafficData.length === 0) return null;
    
    const highestTraffic = trafficData.reduce((max, day) => 
      day.entrance > max.entrance ? day : max
    );
    
    const lowestTraffic = trafficData.reduce((min, day) => 
      day.entrance < min.entrance ? day : min
    );
    
    return { highestTraffic, lowestTraffic };
  };

  const insights = getTrafficInsights();

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      pages.push(
        <button
          key={1}
          className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }
      
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }
      
      if (start > 2) {
        pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
      
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
      }
      
      pages.push(
        <button
          key={totalPages}
          className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="analytics-page">
      <header className="header-card">
        <h1>ANALYTICS & REPORTS</h1>
        <p className="subtitle">Dashboard / Analytics & Reports</p>
      </header>
      <hr className="header-divider" />

      <div className="analytics-container">
        <div className="metrics-row">
          <div className="filter-group button-group">
            <button 
              className="generate-report-btn"
              onClick={() => setShowFilterPopup(true)}
              style={{
                background: 'linear-gradient(135deg, #01311d 0%, #548772 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Generate Report
            </button>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.totalStudents.toLocaleString()}</div>
            <div className="metric-label">TOTAL STUDENTS</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.currentStudentsInside.toLocaleString()}</div>
            <div className="metric-label">CURRENT STUDENTS INSIDE</div>
          </div>
        </div>

        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <section className="chart-section">
              <div className="section-header">
                <h2>Daily Traffic Trend (Entries and Exits)</h2>
                <div className="time-range-selector">
                  <button
                    className={`range-btn ${timeRange === '7days' ? 'active' : ''}`}
                    onClick={() => setTimeRange('7days')}
                  >
                    7 Days
                  </button>
                  <button
                    className={`range-btn ${timeRange === '30days' ? 'active' : ''}`}
                    onClick={() => setTimeRange('30days')}
                  >
                    30 Days
                  </button>
                  <button
                    className={`range-btn ${timeRange === '1year' ? 'active' : ''}`}
                    onClick={() => setTimeRange('1year')}
                  >
                    1 Year
                  </button>
                </div>
              </div>
              <TrafficChart data={trafficData} />
              {insights && (
                <div className="insights">
                  <h4>Insights:</h4>
                  <ul>
                    <li>
                      <strong>Highest traffic:</strong> {insights.highestTraffic.date} ({insights.highestTraffic.entrance.toLocaleString()} entrances)
                    </li>
                    <li>
                      <strong>Lowest traffic:</strong> {insights.lowestTraffic.date} ({insights.lowestTraffic.entrance.toLocaleString()} entrances)
                    </li>
                    <li>
                      <strong>Peak hour today:</strong> 8:15 AM (350 entrances)
                    </li>
                  </ul>
                </div>
              )}
            </section>

            <section className="chart-section">
              <div className="section-header">
                <h2>Authentication Method Usage</h2>
                <button className="info-btn" title="More information">ℹ</button>
              </div>
              <AuthenticationChart data={authData} />
              <div className="table-container small-table">
                <table className="analytics-table small-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Method</th>
                      <th>Attempts</th>
                      <th>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authData.map((auth, index) => (
                      <tr key={auth.id}>
                        <td>{index + 1}</td>
                        <td>{auth.method}</td>
                        <td>{auth.attempts.toLocaleString()}</td>
                        <td>{auth.successRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="chart-section">
              <div className="section-header">
                <h2>Department Distribution (Current Campus Population)</h2>
                <button className="info-btn" title="More information">ℹ</button>
              </div>
              <CollegeDistributionChart data={collegeData} />
              <div className="campus-summary">
                <p>
                  <strong>Total students by department:</strong>{' '}
                  {collegeData.reduce((sum, college) => sum + college.presenceNow, 0).toLocaleString()} students
                </p>
              </div>
              <div className="table-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Department</th>
                      <th>Present Now</th>
                      <th>Total Students</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCollegeData.map((college, index) => (
                      <tr key={college.id}>
                        <td>{indexOfFirstRecord + index + 1}</td>
                        <td title={college.fullCollegeName}>{college.collegeName}</td>
                        <td>{college.presenceNow.toLocaleString()}</td>
                        <td>{college.totalStudents.toLocaleString()}</td>
                        <td>{college.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="pagination-button" onClick={goToPreviousPage} disabled={currentPage === 1}>
                    ← Previous
                  </button>
                  <div className="page-numbers">{renderPageNumbers()}</div>
                  <button className="pagination-button" onClick={goToNextPage} disabled={currentPage === totalPages}>
                    Next →
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Filter Popup - Using your existing GenerateReportFilter */}
      {showFilterPopup && (
        <GenerateReportFilter 
          onClose={() => setShowFilterPopup(false)}
          onGenerate={handleApplyFilters}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && filteredReportData && (
        <div className="modal-overlay" onClick={handleClosePdfPreview} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{
            borderRadius: '12px',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="pdf-preview-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Report Preview</h2>
              <button className="close-btn" onClick={handleClosePdfPreview} style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}>×</button>
            </div>
            <div className="pdf-preview-content" style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px'
            }}>
              <GenerateReportPdf 
                ref={pdfRef}
                reportData={filteredReportData}
                filters={appliedFilters}
              />
            </div>
            <div className="pdf-preview-footer" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 20px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button className="cancel-btn" onClick={handleClosePdfPreview} style={{
                padding: '10px 20px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                Close
              </button>
              <button className="download-btn" onClick={handleDownloadPDF} style={{
                padding: '10px 20px',
                backgroundColor: '#548772',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Chart Components
function TrafficChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="entranceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#58761B" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#58761B" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D99201" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#D99201" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" stroke="#666666" tick={{ fontSize: 12 }} />
          <YAxis stroke="#666666" tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '12px', padding: '8px' }} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }} />
          <Area type="monotone" dataKey="entrance" stroke="#58761B" strokeWidth={2} fill="url(#entranceGradient)" dot={{ fill: '#58761B', r: 3 }} activeDot={{ r: 5 }} name="Entrances" />
          <Area type="monotone" dataKey="exit" stroke="#D99201" strokeWidth={2} fill="url(#exitGradient)" dot={{ fill: '#D99201', r: 3 }} activeDot={{ r: 5 }} name="Exits" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CollegeDistributionChart({ data }) {
  const sortedData = [...data].sort((a, b) => b.presenceNow - a.presenceNow);
  return (
    <div className="chart-container college-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis type="number" stroke="#666666" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="collegeName" stroke="#666666" width={110} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => [value.toLocaleString(), "Present Now"]} contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '11px', padding: '6px' }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="presenceNow" fill="#58761B" name="Present Now" barSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AuthenticationChart({ data }) {
  const pieData = data.map(item => ({ name: item.method, value: item.attempts }));
  return (
    <div className="chart-container pie-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <Pie data={pieData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} outerRadius={100} dataKey="value" fontSize={12}>
            {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={AUTH_COLORS[index % AUTH_COLORS.length]} />))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '12px', padding: '8px' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Analytics;