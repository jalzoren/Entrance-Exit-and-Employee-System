import React, { useState, useEffect } from 'react';
import '../componentscss/GenerateReportFilter.css';
import '../css/GlobalModal.css';
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
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">GENERATE REPORT FILTER</h2>
          <button className='modal-close' onClick={onClose}>✕</button>
        </div>

        {/* Filter Form */}
        <div className="modal-body">
          {/* Date Range Row with DatePicker */}
          <div className="modal-grid-2">
            <div className="modal-field">
              <label className="modal-label">Date From</label>
              <DatePicker
                selected={filters.dateFrom}
                onChange={(date) => handleDateChange(date, 'dateFrom')}
                selectsStart
                startDate={filters.dateFrom}
                endDate={filters.dateTo}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                className="modal-input report-datepicker-field"
                wrapperClassName="report-datepicker-wrapper"
                isClearable
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                popperClassName="report-datepicker-popper"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Date To</label>
              <DatePicker
                selected={filters.dateTo}
                onChange={(date) => handleDateChange(date, 'dateTo')}
                selectsEnd
                startDate={filters.dateFrom}
                endDate={filters.dateTo}
                minDate={filters.dateFrom}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                className="modal-input report-datepicker-field"
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
          <div className="modal-field modal-full-width">
            <label className="modal-label">College Department</label>
            <select
              value={filters.collegeDepartment}
              onChange={(e) => handleInputChange(e, 'collegeDepartment')}
              className="modal-select"
            >
              {departmentOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status and Year Level Row */}
          <div className="modal-grid-2">
            <div className="modal-field">
              <label className="modal-label">Enrollment Status</label>
              <select
                value={filters.enrollmentStatus}
                onChange={(e) => handleInputChange(e, 'enrollmentStatus')}
                className="modal-select"
              >
                {enrollmentStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">Year Level</label>
              <select
                value={filters.yearLevel}
                onChange={(e) => handleInputChange(e, 'yearLevel')}
                className="modal-select"
              >
                {yearLevelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="modal-footer">
          <button 
            className="modal-btn modal-btn-cancel" 
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
          <button 
            className="modal-btn modal-btn-save" 
            onClick={handleGenerate}
            type="button"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenerateReportFilter;