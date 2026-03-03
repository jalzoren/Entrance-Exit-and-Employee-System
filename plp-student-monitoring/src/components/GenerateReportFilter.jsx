import React, { useState, useEffect } from 'react';
import '../componentscss/GenerateReportFilter.css';
import { MdClose } from "react-icons/md";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function GenerateReportFilter({ onClose, onGenerate }) {
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    collegeDepartment: '',
    enrollmentStatus: '',
    yearLevel: ''
  });

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleInputChange = (e, field) => {
    setFilters({
      ...filters,
      [field]: e.target.value
    });
  };

  const handleDateChange = (date, field) => {
    setFilters({
      ...filters,
      [field]: date
    });
  };

  const handleGenerate = () => {
    const reportFilters = {
      dateRange: {
        from: filters.dateFrom ? filters.dateFrom.toLocaleDateString('en-GB') : '',
        to: filters.dateTo ? filters.dateTo.toLocaleDateString('en-GB') : ''
      },
      collegeDepartment: filters.collegeDepartment,
      enrollmentStatus: filters.enrollmentStatus,
      yearLevel: filters.yearLevel
    };
    
    console.log('Generating report with filters:', reportFilters);
    
    if (onGenerate) {
      onGenerate(reportFilters);
    }
    onClose();
  };

  const handleCancel = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      collegeDepartment: '',
      enrollmentStatus: '',
      yearLevel: ''
    });
    onClose();
  };

  // Handle overlay click (click outside to close)
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('report-filter-overlay')) {
      onClose();
    }
  };

  // Department options
  const departmentOptions = [
    { value: '', label: 'Select College Department' },
    { value: 'College of Nursing', label: 'College of Nursing' },
    { value: 'College of Engineering', label: 'College of Engineering' },
    { value: 'College of Education', label: 'College of Education' },
    { value: 'College of Computer Studies', label: 'College of Computer Studies' },
    { value: 'College of Arts and Science', label: 'College of Arts and Science' },
    { value: 'College of Business and Accountancy', label: 'College of Business and Accountancy' },
    { value: 'College of Hospitality Management', label: 'College of Hospitality Management' }
  ];

  // Enrollment Status options
  const enrollmentStatusOptions = [
    { value: '', label: 'Select Status' },
    { value: 'Regular', label: 'Regular' },
    { value: 'Irregular', label: 'Irregular' }
  ];

  // Year Level options
  const yearLevelOptions = [
    { value: '', label: 'Select Year Level' },
    { value: '1st Year', label: '1st Year' },
    { value: '2nd Year', label: '2nd Year' },
    { value: '3rd Year', label: '3rd Year' },
    { value: '4th Year', label: '4th Year' }
  ];

  return (
    <div className="report-filter-overlay" onClick={handleOverlayClick}>
      <div className="report-filter-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-filter-header">
          <div className="report-filter-title">GENERATE REPORT FILTER</div>
          <div className="report-filter-close">
            <button className='report-filter-close-btn' onClick={onClose}>
              <MdClose />
            </button>
          </div>
        </div>

        {/* Filter Form */}
        <div className="report-filter-form">
          {/* Date Range Row with DatePicker */}
          <div className="report-filter-row">
            <div className="report-filter-group">
              <label className="report-filter-label">Date From</label>
              <DatePicker
                selected={filters.dateFrom}
                onChange={(date) => handleDateChange(date, 'dateFrom')}
                selectsStart
                startDate={filters.dateFrom}
                endDate={filters.dateTo}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                className="report-filter-field report-datepicker-field"
                wrapperClassName="report-datepicker-wrapper"
                isClearable
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                popperClassName="report-datepicker-popper"
              />
            </div>
            <div className="report-filter-group">
              <label className="report-filter-label">Date To</label>
              <DatePicker
                selected={filters.dateTo}
                onChange={(date) => handleDateChange(date, 'dateTo')}
                selectsEnd
                startDate={filters.dateFrom}
                endDate={filters.dateTo}
                minDate={filters.dateFrom}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                className="report-filter-field report-datepicker-field"
                wrapperClassName="report-datepicker-wrapper"
                isClearable
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                popperClassName="report-datepicker-popper"
              />
            </div>
          </div>

          {/* College Department Row with Dropdown */}
          <div className="report-filter-row">
            <div className="report-filter-group report-full-width">
              <label className="report-filter-label">College Department</label>
              <select
                value={filters.collegeDepartment}
                onChange={(e) => handleInputChange(e, 'collegeDepartment')}
                className="report-filter-select"
              >
                {departmentOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status and Year Level Row */}
          <div className="report-filter-row">
            <div className="report-filter-group">
              <label className="report-filter-label">Enrollment Status</label>
              <select
                value={filters.enrollmentStatus}
                onChange={(e) => handleInputChange(e, 'enrollmentStatus')}
                className="report-filter-select"
              >
                {enrollmentStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="report-filter-group">
              <label className="report-filter-label">Year Level</label>
              <select
                value={filters.yearLevel}
                onChange={(e) => handleInputChange(e, 'yearLevel')}
                className="report-filter-select"
              >
                {yearLevelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="report-filter-actions">
            <button 
              className="report-filter-btn report-filter-btn-cancel" 
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
            <button 
              className="report-filter-btn report-filter-btn-generate" 
              onClick={handleGenerate}
              type="button"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerateReportFilter;