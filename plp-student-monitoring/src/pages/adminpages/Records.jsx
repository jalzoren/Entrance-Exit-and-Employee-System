import React, { useState, useMemo } from 'react';
import '../../css/Records.css'; // Create this CSS file for styling
import GenerateReportFilter from '../../components/GenerateReportFilter'; // Import the filter component
import { useLogContext } from '../../context/LogContext';

function Records() {
  // State for filter popup
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  
  // Get logs from context
  const { logs } = useLogContext();

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
        collegeDept: 'BSIT', // Default or fetch from backend
        yearLevel: '3rd Year', // Default or fetch from backend
        action: log.action === 'ENTRY' ? 'Entry' : 'Exit',
        method: log.method === 'FACE' ? 'Facial Recognition' : 'Manual'
      }))
      .reverse(); // Show newest first
  }, [logs]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  
  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = allRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(allRecords.length / recordsPerPage);

  // Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of visible pages
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at the beginning
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }
      
      // Adjust if at the end
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pageNumbers.push('...');
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always show last page
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

  // Handler for generating report with filters
  const handleGenerateReport = (filters) => {
    console.log('Generating report with filters:', filters);
    // Here you would typically make an API call or process the data
    alert('Report generated with filters! Check console for details.');
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
              <select id="yearLevel" className="filter-select year-select">
                <option value="">Year Level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
              </select>
            </div>

            <div className="filter-group dept-group">
              <select id="department" className="filter-select">
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
              <select id="action" className="filter-select">
                <option value="">Action</option>
                <option value="Entry">Entry</option>
                <option value="Exit">Exit</option>
              </select>
            </div>

            <div className="filter-group date-group">
              <select id="date" className="filter-select">
                <option value="">Date</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="filter-group search-group">
              <input 
                type="text" 
                id="search" 
                className="search-input" 
                placeholder="Search"
              />
            </div>

            <div className="filter-group button-group">
              <button 
                className="generate-report-btn"
                onClick={() => setShowFilterPopup(true)}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        <div className="table-container">
          {allRecords.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <p>No entry-exit records yet. Records will appear when face recognition is used.</p>
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
        {allRecords.length > 0 && (
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

      {/* Generate Report Filter Popup */}
      {showFilterPopup && (
        <GenerateReportFilter 
          onClose={() => setShowFilterPopup(false)}
          onGenerate={handleGenerateReport}
        />
      )}
    </div>
  );
}

export default Records;