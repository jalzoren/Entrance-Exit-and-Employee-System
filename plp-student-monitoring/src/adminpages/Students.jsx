import React, { useState, useEffect } from 'react';
import '../css/Students.css';
import RegisterStudent from '../components/RegisterStudent';
import ImportStudent from '../components/ImportStudents';
import axios from 'axios';
import { FiDownload, FiPlus, FiFilter } from 'react-icons/fi';
import { IoMdArrowDropdown } from 'react-icons/io';

function Students() {
  const [students, setStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // New state for import modal

  // ✅ FETCH STUDENTS FROM DATABASE
  const fetchStudents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/students');
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // ✅ FILTERING
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name} ${student.last_name} ${student.middle_name || ''}`.toLowerCase();

    return (
      (department === '' || student.college_department === department) &&
      (yearLevel === '' || student.year_level === yearLevel) &&
      (registrationDate === '' || student.created_at?.includes(registrationDate)) &&
      (searchQuery === '' ||
        student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fullName.includes(searchQuery.toLowerCase()))
    );
  });

  // ✅ PAGINATION
  const recordsPerPage = 5;
  const totalPages = Math.ceil(filteredStudents.length / recordsPerPage);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleAddClick = () => {
    setShowRegisterModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    document.body.style.overflow = 'unset';
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    // Restore body scrolling
    document.body.style.overflow = 'unset';
  };

  const handleEdit = (studentId) => {
    console.log('Edit student:', studentId);
  };

  const handleDeactivate = (studentId, currentStatus) => {
    console.log('Deactivate student:', studentId, currentStatus);
  };

  const handleViewPhoto = (studentId) => {
    console.log('View photo:', studentId);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are less than max visible
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
      // Always show first page
      pages.push(
        <button
          key={1}
          className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

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
        pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
      }
      
      // Add middle pages
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
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
      }
      
      // Always show last page
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
    return pages;
  };

  return (
    <div>
      <header className="header-card">
        <h1>STUDENT MANAGEMENT</h1>
        <p className="subtitle">Dashboard / Student Management</p>
      </header>
      <hr className="header-divider" />

      <div className="student-management">
        {/* Controls */}
        <div className="controls">
          <button className="sort-button">
            <FiFilter className="sort-icon" />
            Sort
            <IoMdArrowDropdown className="dropdown-icon" />
          </button>

          <select
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
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
            <option value="College of Nursing">College of Nursing</option>
            <option value="College of Engineering">College of Engineering</option>
            <option value="College of Education">College of Education</option>
            <option value="College of Computer Studies">College of Computer Studies</option>
            <option value="College of Arts and Science">College of Arts and Science</option>
            <option value="College of Business and Accountancy">College of Business and Accountancy</option>
            <option value="College of Hospitality Management">College of Hospitality Management</option>
          </select>

          <select
            className="filter-select"
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
          >
            <option value="">Year Level</option>
            <option value="1st">1st</option>
            <option value="2nd">2nd</option>
            <option value="3rd">3rd</option>
            <option value="4th">4th</option>
          </select>

          <select
            className="filter-select"
            value={registrationDate}
            onChange={(e) => setRegistrationDate(e.target.value)}
          >
            <option value="">Registration Year</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button className="action-button import-button" onClick={handleImportClick}>
            <FiDownload className="button-icon" />
            Import
          </button>

          <button className="action-button add-button" onClick={handleAddClick}>
            <FiPlus className="button-icon" />
            Add
          </button>
        </div>

        {/* TABLE */}
        <div className="table-container">
          <table className="student-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>College/Department</th>
                <th>Year Level</th>
                <th>Status</th>
                <th>Date Registered</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentStudents.map((student, index) => (
                <tr key={student.id}>
                  <td>{indexOfFirstRecord + index + 1}</td>
                  <td>{student.studentId}</td>
                  <td>{student.fullName}</td>
                  <td>{student.department}</td>
                  <td>{student.yearLevel}</td>
                  <td>
                    <span className={`status-badge ${student.enrollmentStatus.toLowerCase()}`}>
                      {student.enrollmentStatus}
                    </span>
                  </td>
                  <td>{student.dateRegistered}</td>
                  <td className="action-cell">
                    <div className="action-buttons-text">
                      <button 
                        className="action-text-btn edit-text-btn" 
                        onClick={() => handleEdit(student.id)}
                      >
                        Edit
                      </button>
                      <button 
                        className="action-text-btn photo-text-btn" 
                        onClick={() => handleViewPhoto(student.id)}
                      >
                        View Photo
                      </button>
                      <button 
                        className={`action-text-btn ${student.enrollmentStatus === 'Active' ? 'deactivate-text-btn' : 'activate-text-btn'}`}
                        onClick={() => handleDeactivate(student.id, student.enrollmentStatus)}
                      >
                        {student.enrollmentStatus === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {currentStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center' }}>
                    No students found
                  </td>
                </tr>
              ) : (
                currentStudents.map((student, index) => (
                  <tr key={student.student_id}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{student.student_id}</td>
                    <td>
                      {student.first_name} {student.last_name} {student.middle_name}
                    </td>
                    <td>{student.college_department}</td>
                    <td>{student.year_level}</td>
                    <td>
                      <span className={`status-badge ${student.status.toLowerCase()}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>{student.created_at?.split('T')[0]}</td>
                    <td className="action-cell">
                      <div className="action-buttons-text">
                        <button
                          className="action-text-btn edit-text-btn"
                          onClick={() => handleEdit(student.student_id)}
                        >
                          Edit
                        </button>

                        <button
                          className="action-text-btn photo-text-btn"
                          onClick={() => handleViewPhoto(student.student_id)}
                        >
                          View Photo
                        </button>

                        <button
                          className="action-text-btn deactivate-text-btn"
                          onClick={() => handleDeactivate(student.student_id, student.status)}
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          <div className="page-numbers">
            {renderPageNumbers()}
          </div>

          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      </div>

      {/* REGISTER MODAL */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={handleCloseRegisterModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <RegisterStudent onClose={handleCloseRegisterModal} />
            <RegisterStudent
              onClose={handleCloseModal}
              refreshTable={fetchStudents}   // 🔥 auto refresh
            />
          </div>
        </div>
      )}

      {/* Import Student Modal */}
      {showImportModal && (
        <ImportStudent 
          isOpen={showImportModal} 
          onClose={handleCloseImportModal} 
        />
      )}
    </div>
  );
}

export default Students;