import React, { useEffect, useMemo, useState } from 'react';
import '../../css/Records.css';

const STUDENT_YEAR_LEVELS = [
  { value: '', label: 'Year Level' },
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
  { value: '5th Year', label: '5th Year' },
];

const STUDENT_DEPARTMENTS = [
  { value: '', label: 'Select College Department' },
  { value: 'College of Nursing', label: 'College of Nursing' },
  { value: 'College of Engineering', label: 'College of Engineering' },
  { value: 'College of Education', label: 'College of Education' },
  { value: 'College of Computer Studies', label: 'College of Computer Studies' },
  { value: 'College of Arts and Science', label: 'College of Arts and Science' },
  { value: 'College of Business and Accountancy', label: 'College of Business and Accountancy' },
  { value: 'College of Hospitality Management', label: 'College of Hospitality Management' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Action' },
  { value: 'ENTRY', label: 'Entrance' },
  { value: 'EXIT', label: 'Exit' },
];

const DATE_OPTIONS = [
  { value: '', label: 'Date' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
];

const DEFAULT_STUDENT_FILTERS = {
  yearLevel: '',
  department: '',
  action: '',
  date: '',
  search: '',
};

const DEFAULT_VISITOR_FILTERS = {
  action: '',
  date: '',
  search: '',
};

const RECORDS_PER_PAGE = 10;

const formatDateTime = (value) => {
  if (!value) return 'Not Specified';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Specified';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
};

const toLowerText = (value) => String(value ?? '').toLowerCase();

const matchesSearch = (values, searchTerm) => {
  if (!searchTerm) return true;

  return values.some((value) => toLowerText(value).includes(searchTerm));
};

const matchesDateFilter = (timestamp, dateFilter) => {
  if (!dateFilter) return true;

  const recordDate = new Date(timestamp);
  if (Number.isNaN(recordDate.getTime())) return false;

  const today = new Date();

  if (dateFilter === 'today') {
    return recordDate.toDateString() === today.toDateString();
  }

  if (dateFilter === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return recordDate.toDateString() === yesterday.toDateString();
  }

  if (dateFilter === 'this-week') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return recordDate >= startOfWeek;
  }

  if (dateFilter === 'this-month') {
    return recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear();
  }

  return true;
};

const applyStudentFilters = (records, filters) => {
  const searchTerm = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.yearLevel && record.yearLevel !== filters.yearLevel) return false;
    if (filters.department && record.collegeDept !== filters.department) return false;
    if (filters.action && record.action !== filters.action) return false;
    if (!matchesDateFilter(record.timestamp, filters.date)) return false;

    return matchesSearch([
      record.studentId,
      record.name,
      record.collegeDept,
      record.yearLevel,
      record.method,
    ], searchTerm);
  });
};

const applyVisitorFilters = (records, filters) => {
  const searchTerm = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.action && record.action !== filters.action) return false;
    if (!matchesDateFilter(record.timestamp, filters.date)) return false;

    return matchesSearch([
      record.visitorId,
      record.name,
      record.email,
      record.reason,
      record.otherReason,
      record.visitReason,
    ], searchTerm);
  });
};

function Records() {
  const [activeTab, setActiveTab] = useState('student');
  const [studentRecords, setStudentRecords] = useState([]);
  const [visitorRecords, setVisitorRecords] = useState([]);
  const [studentFilters, setStudentFilters] = useState(DEFAULT_STUDENT_FILTERS);
  const [visitorFilters, setVisitorFilters] = useState(DEFAULT_VISITOR_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const loadRecords = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await fetch('/api/analytics/records', { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to load records (${response.status})`);
        }

        const payload = await response.json();

        setStudentRecords((payload.students || []).map((record) => ({
          ...record,
          displayDateTime: formatDateTime(record.timestamp),
        })));

        setVisitorRecords((payload.visitors || []).map((record) => ({
          ...record,
          displayDateTime: formatDateTime(record.timestamp),
        })));
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        console.error('Records page failed to load:', error);
        setLoadError(error?.message || 'Unable to load records.');
        setStudentRecords([]);
        setVisitorRecords([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadRecords();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, studentFilters, visitorFilters]);

  const filteredStudentRecords = useMemo(
    () => applyStudentFilters(studentRecords, studentFilters),
    [studentRecords, studentFilters],
  );

  const filteredVisitorRecords = useMemo(
    () => applyVisitorFilters(visitorRecords, visitorFilters),
    [visitorRecords, visitorFilters],
  );

  const activeRecords = activeTab === 'student' ? filteredStudentRecords : filteredVisitorRecords;
  const totalActiveRecords = activeTab === 'student' ? studentRecords.length : visitorRecords.length;

  const indexOfLastRecord = currentPage * RECORDS_PER_PAGE;
  const indexOfFirstRecord = indexOfLastRecord - RECORDS_PER_PAGE;
  const currentRecords = activeRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.max(1, Math.ceil(activeRecords.length / RECORDS_PER_PAGE));

  const handleStudentFilterChange = (field, value) => {
    setStudentFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleVisitorFilterChange = (field, value) => {
    setVisitorFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    if (activeTab === 'student') {
      setStudentFilters(DEFAULT_STUDENT_FILTERS);
      return;
    }

    setVisitorFilters(DEFAULT_VISITOR_FILTERS);
  };

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

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let page = 1; page <= totalPages; page += 1) {
        pageNumbers.push(page);
      }
      return pageNumbers;
    }

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

    for (let page = start; page <= end; page += 1) {
      pageNumbers.push(page);
    }

    if (end < totalPages - 1) {
      pageNumbers.push('...');
    }

    pageNumbers.push(totalPages);

    return pageNumbers;
  };

  const activeTabLabel = activeTab === 'student' ? 'student' : 'visitor';

  return (
    <div>
      <header className="header-card">
        <h1>ENTRY-EXIT RECORDS</h1>
        <p className="subtitle">Dashboard / Entry-Exit Records</p>
      </header>

      <hr className="header-divider" />

      <div className="records-container">
        <div className="records-tabs" role="tablist" aria-label="Entry and exit record tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'student'}
            className={`records-tab ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            <span>Student Records</span>
            <span className="records-tab-count">{studentRecords.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'visitor'}
            className={`records-tab ${activeTab === 'visitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('visitor')}
          >
            <span>Visitor Records</span>
            <span className="records-tab-count">{visitorRecords.length}</span>
          </button>
        </div>

        <p className="records-summary">
          {isLoading
            ? 'Loading records from the database...'
            : loadError
              ? loadError
              : `Showing ${activeRecords.length} of ${totalActiveRecords} ${activeTabLabel} records`}
        </p>

        <div className="filters-container">
          <div className="filters-wrapper">
            {activeTab === 'student' ? (
              <>
                <div className="filter-group year-group">
                  <select
                    id="yearLevel"
                    className="filter-select year-select"
                    value={studentFilters.yearLevel}
                    onChange={(event) => handleStudentFilterChange('yearLevel', event.target.value)}
                  >
                    {STUDENT_YEAR_LEVELS.map((option) => (
                      <option key={option.label} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group dept-group">
                  <select
                    id="department"
                    className="filter-select"
                    value={studentFilters.department}
                    onChange={(event) => handleStudentFilterChange('department', event.target.value)}
                  >
                    {STUDENT_DEPARTMENTS.map((option) => (
                      <option key={option.label} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group action-group">
                  <select
                    id="action"
                    className="filter-select"
                    value={studentFilters.action}
                    onChange={(event) => handleStudentFilterChange('action', event.target.value)}
                  >
                    {ACTION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group date-group">
                  <select
                    id="date"
                    className="filter-select"
                    value={studentFilters.date}
                    onChange={(event) => handleStudentFilterChange('date', event.target.value)}
                  >
                    {DATE_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group search-group">
                  <input
                    type="text"
                    id="search"
                    className="search-input"
                    placeholder="Search by name or ID"
                    value={studentFilters.search}
                    onChange={(event) => handleStudentFilterChange('search', event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="filter-group action-group">
                  <select
                    id="visitor-action"
                    className="filter-select"
                    value={visitorFilters.action}
                    onChange={(event) => handleVisitorFilterChange('action', event.target.value)}
                  >
                    {ACTION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group date-group">
                  <select
                    id="visitor-date"
                    className="filter-select"
                    value={visitorFilters.date}
                    onChange={(event) => handleVisitorFilterChange('date', event.target.value)}
                  >
                    {DATE_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group search-group">
                  <input
                    type="text"
                    id="visitor-search"
                    className="search-input"
                    placeholder="Search by name, email, or reason"
                    value={visitorFilters.search}
                    onChange={(event) => handleVisitorFilterChange('search', event.target.value)}
                  />
                </div>
              </>
            )}

            <div className="filter-group button-group">
              <button type="button" className="reset-filters-btn" onClick={resetFilters}>
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        <div className="table-container">
          {isLoading ? (
            <div className="records-state">Loading records from the database...</div>
          ) : loadError ? (
            <div className="records-state error">{loadError}</div>
          ) : activeRecords.length === 0 ? (
            <div className="records-state">
              {activeTab === 'student'
                ? 'No student records match your filters. Try adjusting the selected year, department, action, or search term.'
                : 'No visitor records match your filters. Try adjusting the selected action, date, or search term.'}
            </div>
          ) : activeTab === 'student' ? (
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
                  <tr key={record.id || record.studentId || index}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{record.displayDateTime}</td>
                    <td>{record.studentId || 'N/A'}</td>
                    <td>{record.name || 'Unknown'}</td>
                    <td>{record.collegeDept || 'Not Specified'}</td>
                    <td>{record.yearLevel || 'Not Specified'}</td>
                    <td>
                      <span className={`action-badge ${String(record.action || '').toLowerCase()}`}>
                        {record.actionLabel || 'Entrance'}
                      </span>
                    </td>
                    <td>{record.method || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Date & Time</th>
                  <th>Visitor ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record, index) => (
                  <tr key={record.id || record.visitorId || index}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{record.displayDateTime}</td>
                    <td>{record.visitorId || 'N/A'}</td>
                    <td>{record.name || 'Unknown'}</td>
                    <td>{record.email || 'Not Specified'}</td>
                    <td>{record.visitReason || record.reason || 'Not Specified'}</td>
                    <td>
                      <span className={`action-badge ${String(record.action || '').toLowerCase()}`}>
                        {record.actionLabel || 'Entrance'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {activeRecords.length > 0 && totalPages > 1 && (
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
                      type="button"
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