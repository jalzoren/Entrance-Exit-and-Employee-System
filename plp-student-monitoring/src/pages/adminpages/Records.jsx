import React, { useState, useMemo, useRef } from 'react';
import '../../css/Records.css';

import { useLogContext } from '../../context/LogContext';

function Records() {
  // State for filter popup
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [filteredReportData, setFilteredReportData] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  
  // Get logs from context
  const { logs } = useLogContext();
  const pdfRef = useRef(null);

  // Get successful logs only (exclude failed attempts)
  const allRecords = useMemo(() => {
    return logs
      .filter(log => !log.failed)
      .map((log, index) => ({
        ...log,
        dateTime: new Date(log.timestamp).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        collegeDept: log.collegeDept || 'BSIT',
        yearLevel: log.yearLevel || '3rd Year',
        action: log.action === 'ENTRY' ? 'Entrance' : 'Exit',
        method: log.method === 'FACE' ? 'Face Recognition' : 'Manual Entry'
      }))
      .reverse();
  }, [logs]);

  // Function to apply filters and prepare report data
  const handleApplyFilters = (filters) => {
    console.log('Applying filters:', filters);
    setAppliedFilters(filters);
    
    // Filter records based on selected filters
    let filteredRecords = [...allRecords];
    
    // Filter by date range
    if (filters.dateRange?.from && filters.dateRange?.to) {
      const fromDate = new Date(filters.dateRange.from.split('/').reverse().join('-'));
      const toDate = new Date(filters.dateRange.to.split('/').reverse().join('-'));
      toDate.setHours(23, 59, 59);
      
      filteredRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= fromDate && recordDate <= toDate;
      });
    }
    
    // Filter by college department
    if (filters.collegeDepartment) {
      filteredRecords = filteredRecords.filter(
        record => record.collegeDept === filters.collegeDepartment
      );
    }
    
    // Filter by enrollment status (if you have this data)
    if (filters.enrollmentStatus) {
      filteredRecords = filteredRecords.filter(
        record => record.enrollmentStatus === filters.enrollmentStatus
      );
    }
    
    // Filter by year level
    if (filters.yearLevel) {
      filteredRecords = filteredRecords.filter(
        record => record.yearLevel === filters.yearLevel
      );
    }
    
    // Prepare report data
    const reportData = prepareReportData(filteredRecords, filters);
    setFilteredReportData(reportData);
    setShowPdfPreview(true);
    setShowFilterPopup(false);
  };
  
  // Function to prepare report data from filtered records
  const prepareReportData = (records, filters) => {
    // Calculate total students (unique students)
    const uniqueStudents = new Set();
    records.forEach(record => uniqueStudents.add(record.studentId));
    const totalStudents = uniqueStudents.size;
    
    // Calculate total capacity (you can adjust this)
    const totalCapacity = 2000;
    
    // Date range display
    const dateRangeDisplay = filters.dateRange?.from && filters.dateRange?.to
      ? `${filters.dateRange.from} - ${filters.dateRange.to}`
      : 'All Time';
    
    // College distribution
    const collegeMap = new Map();
    records.forEach(record => {
      const dept = record.collegeDept;
      collegeMap.set(dept, (collegeMap.get(dept) || 0) + 1);
    });
    
    const collegeData = Array.from(collegeMap.entries()).map(([name, count]) => ({
      name,
      count,
      percentage: ((count / records.length) * 100).toFixed(1)
    }));
    
    // Gender distribution (if you have gender data)
    const maleCount = records.filter(r => r.gender === 'Male').length;
    const femaleCount = records.filter(r => r.gender === 'Female').length;
    const genderData = {
      male: records.length > 0 ? ((maleCount / records.length) * 100).toFixed(1) : 0,
      female: records.length > 0 ? ((femaleCount / records.length) * 100).toFixed(1) : 0,
      maleCount,
      femaleCount
    };
    
    // Method distribution
    const methodMap = new Map();
    records.forEach(record => {
      const method = record.method;
      methodMap.set(method, (methodMap.get(method) || 0) + 1);
    });
    
    const methodData = Array.from(methodMap.entries()).map(([name, count]) => ({
      name,
      count,
      total: records.length,
      percentage: ((count / records.length) * 100).toFixed(1)
    }));
    
    // Traffic summary
    const trafficData = {
      highest: 'Wednesday (1,240 entries)',
      lowest: 'Sunday (180 entries)',
      peakHour: '8:15 AM (320 entries)'
    };
    
    // Student logs for table
    const studentLogs = records.map((record, index) => ({
      no: index + 1,
      dateTime: record.dateTime,
      studentId: record.studentId,
      name: record.name,
      department: record.collegeDept,
      action: record.action,
      method: record.method
    }));
    
    return {
      totalStudents,
      totalCapacity,
      dateRange: dateRangeDisplay,
      collegeData,
      genderData,
      methodData,
      trafficData,
      studentLogs
    };
  };
  
  // Function to trigger PDF download
  const handleDownloadPDF = () => {
    if (pdfRef.current) {
      pdfRef.current.generatePDF();
    }
  };
  
  // Function to close PDF preview
  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    setFilteredReportData(null);
  };

  // State for local filters
  const [localFilters, setLocalFilters] = useState({
    yearLevel: '',
    department: '',
    action: '',
    date: '',
    search: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  
  // Apply local filters to records
  const filteredRecords = useMemo(() => {
    let records = [...allRecords];
    
    // Filter by year level
    if (localFilters.yearLevel) {
      records = records.filter(record => record.yearLevel === localFilters.yearLevel);
    }
    
    // Filter by department
    if (localFilters.department) {
      records = records.filter(record => record.collegeDept === localFilters.department);
    }
    
    // Filter by action
    if (localFilters.action) {
      records = records.filter(record => record.action === localFilters.action);
    }
    
    // Filter by date
    const today = new Date();
    if (localFilters.date === 'today') {
      records = records.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate.toDateString() === today.toDateString();
      });
    } else if (localFilters.date === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      records = records.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate.toDateString() === yesterday.toDateString();
      });
    } else if (localFilters.date === 'this-week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      records = records.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= startOfWeek;
      });
    } else if (localFilters.date === 'this-month') {
      records = records.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate.getMonth() === today.getMonth() && 
               recordDate.getFullYear() === today.getFullYear();
      });
    }
    
    // Filter by search
    if (localFilters.search) {
      const searchTerm = localFilters.search.toLowerCase();
      records = records.filter(record => 
        record.name?.toLowerCase().includes(searchTerm) ||
        record.studentId?.toLowerCase().includes(searchTerm)
      );
    }
    
    return records;
  }, [allRecords, localFilters]);
  
  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [localFilters]);

  // Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }
      
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }
      
      if (start > 2) {
        pageNumbers.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      if (end < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  // Pagination handlers
  const goToPage = (page) => {
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

  // Handle filter changes
  const handleFilterChange = (e, filterName) => {
    setLocalFilters({
      ...localFilters,
      [filterName]: e.target.value
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setLocalFilters({
      yearLevel: '',
      department: '',
      action: '',
      date: '',
      search: ''
    });
  };

  return (
    <div>
      <header className="header-card">
        <h1>ENTRY-EXIT RECORDS</h1>
        <p className="subtitle">Dashboard / Entry-Exit Records</p>
      </header>
      
      <hr className="header-divider" />
      
      <div className="records-container">
        {/* Filters and Actions Section */}
        <div className="filters-container">
          <div className="filters-wrapper">
            <div className="filter-group year-group">
              <select 
                id="yearLevel" 
                className="filter-select year-select"
                value={localFilters.yearLevel}
                onChange={(e) => handleFilterChange(e, 'yearLevel')}
              >
                <option value="">Year Level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
              </select>
            </div>

            <div className="filter-group dept-group">
              <select 
                id="department" 
                className="filter-select"
                value={localFilters.department}
                onChange={(e) => handleFilterChange(e, 'department')}
              >
                <option value="">Select College Department</option>
                <option value="College of Nursing">College of Nursing</option>
                <option value="College of Engineering">College of Engineering</option>
                <option value="College of Education">College of Education</option>
                <option value="College of Computer Studies">College of Computer Studies</option>
                <option value="College of Arts and Science">College of Arts and Science</option>
                <option value="College of Business and Accountancy">
                  College of Business and Accountancy
                </option>
                <option value="College of Hospitality Management">
                  College of Hospitality Management
                </option>
              </select>
            </div>

            <div className="filter-group action-group">
              <select 
                id="action" 
                className="filter-select"
                value={localFilters.action}
                onChange={(e) => handleFilterChange(e, 'action')}
              >
                <option value="">Action</option>
                <option value="Entry">Entry</option>
                <option value="Exit">Exit</option>
              </select>
            </div>

            <div className="filter-group date-group">
              <select 
                id="date" 
                className="filter-select"
                value={localFilters.date}
                onChange={(e) => handleFilterChange(e, 'date')}
              >
                <option value="">Date</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
              </select>
            </div>

            <div className="filter-group search-group">
              <input 
                type="text" 
                id="search" 
                className="search-input" 
                placeholder="Search by name or ID"
                value={localFilters.search}
                onChange={(e) => handleFilterChange(e, 'search')}
              />
            </div>

          
          </div>
        </div>

        <div className="table-container">
          {filteredRecords.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <p>No records match your filters. Try adjusting the filter criteria.</p>
            </div>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Date & Time</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>College Department</th>
                  <th>Year Level</th>
                  <th>Action</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record, index) => (
                  <tr key={record.id || index}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{record.dateTime}</td>
                    <td>{record.studentId}</td>
                    <td>{record.name}</td>
                    <td>{record.collegeDept}</td>
                    <td>{record.yearLevel}</td>
                    <td>
                      <span className={`action-badge ${record.action.toLowerCase()}`}>
                        {record.action}
                      </span>
                    </td>
                    <td>{record.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Section */}
        {filteredRecords.length > 0 && totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-wrapper">
              <button 
                className="pagination-arrow prev-arrow" 
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <span className="arrow-icon">←</span> Previous
              </button>
              
              <div className="pagination-pages">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      key={page}
                      className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>
              
              <button 
                className="pagination-arrow next-arrow"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next <span className="arrow-icon">→</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Records;