// frontend/src/adminpages/Students.jsx
import React, { useState, useEffect } from "react";
import "../../css/Students.css";
import RegisterStudent from "../../components/RegisterStudent";
import ImportStudent from "../../components/ImportStudents";
import axios from "axios";
import { FiDownload, FiPlus, FiFilter } from "react-icons/fi";
import { IoMdArrowDropdown } from "react-icons/io";
import { IoNotificationsCircleOutline } from "react-icons/io5"; // ← from Version 1

function Students() {
  const [currentPage, setCurrentPage]             = useState(1);
  const [department, setDepartment]               = useState("");
  const [yearLevel, setYearLevel]                 = useState("");
  const [registrationDate, setRegistrationDate]   = useState("");
  const [searchQuery, setSearchQuery]             = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showImportModal, setShowImportModal]     = useState(false);

  // From Version 2 — proper loading/error states
  const [students, setStudents]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // From Version 1 — notification box for pending face registration
  const [pendingFaceCount, setPendingFaceCount] = useState(0);

  const recordsPerPage = 5;

  // ================= FETCH STUDENTS =================
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/api/students");
      if (Array.isArray(response.data)) {
        setStudents(response.data);
      } else {
        setStudents([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(
        err.code === "ERR_NETWORK"
          ? "Cannot connect to server. Make sure backend is running on port 5000."
          : "Failed to load students. Please try again."
      );
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH PENDING FACE REGISTRATION =================
  // Drives the notification box — stays visible until count = 0
  const fetchPendingFaceReg = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/pending-face-registration"
      );
      setPendingFaceCount(response.data.count);
    } catch (err) {
      console.error("Error fetching pending face registration count:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchPendingFaceReg();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, department, yearLevel, registrationDate]);

  // ================= FILTERING =================
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      searchQuery === "" ||
      student.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      department === "" || student.college_department === department;

    const matchesYearLevel =
      yearLevel === "" || student.year_level === yearLevel;

    let matchesDate = true;
    if (registrationDate && student.created_at) {
      const studentDate = new Date(student.created_at);
      matchesDate = studentDate.getFullYear().toString() === registrationDate;
    }

    return matchesSearch && matchesDepartment && matchesYearLevel && matchesDate;
  });

  // ================= PAGINATION =================
  const totalPages         = Math.ceil(filteredStudents.length / recordsPerPage);
  const indexOfLastRecord  = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentStudents    = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ================= MODAL CONTROLS =================
  const handleAddClick = () => {
    setShowRegisterModal(true);
    document.body.style.overflow = "hidden";
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    document.body.style.overflow = "hidden";
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    document.body.style.overflow = "unset";
    fetchStudents();
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    document.body.style.overflow = "unset";
  };

  // Called by ImportStudent after a successful upload
  // Refreshes both the table AND the notification count
  const handleImportSuccess = () => {
    fetchStudents();
    fetchPendingFaceReg();
    handleCloseImportModal();
  };

  // ================= ACTIONS =================
  const handleEdit = (studentId) => {
    console.log("Edit student:", studentId);
  };

  const handleStatusChange = async (studentId, currentStatus) => {
    try {
      const newStatus = currentStatus === "Regular" ? "Irregular" : "Regular";
      await axios.put(`http://localhost:5000/api/students/${studentId}`, {
        status: newStatus,
      });
      fetchStudents();
    } catch (err) {
      console.error("Error updating student status:", err);
      alert("Failed to update student status. Please try again.");
    }
  };

  const handleViewPhoto = (studentId) => {
    console.log("View photo for student:", studentId);
  };

  // ================= HELPERS =================
  // Formats "Juan M. Dela Cruz"
  const formatFullName = (student) => {
    if (!student) return "";
    const firstName     = student.first_name || "";
    const lastName      = student.last_name || "";
    const middleInitial = student.middle_name
      ? ` ${student.middle_name.charAt(0)}.`
      : "";
    return `${firstName}${middleInitial} ${lastName}`.trim();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString)
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "-");
    } catch {
      return "Invalid Date";
    }
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return "unknown";
    return status.toLowerCase();
  };

  // ================= PAGINATION RENDERER =================
  const renderPageNumbers = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? "active" : ""}`}
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
          className={`page-number ${currentPage === 1 ? "active" : ""}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      let start = Math.max(2, currentPage - 1);
      let end   = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2)           end   = Math.min(totalPages - 1, 4);
      if (currentPage >= totalPages - 1) start = Math.max(2, totalPages - 3);
      if (start > 2) pages.push(<span key="e1" className="ellipsis">...</span>);

      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }

      if (end < totalPages - 1) pages.push(<span key="e2" className="ellipsis">...</span>);

      pages.push(
        <button
          key={totalPages}
          className={`page-number ${currentPage === totalPages ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }
    return pages;
  };

  // ================= RENDER =================
  return (
    <div>
      <header className="header-card">
        <h1>STUDENT MANAGEMENT</h1>
        <p className="subtitle">Dashboard / Student Management</p>
      </header>
      <hr className="header-divider" />

      {/* ── NOTIFICATION BOX ──────────────────────────────────────────
          Only renders when students are pending face registration.
          Cannot be dismissed — disappears automatically when count = 0. */}
      {pendingFaceCount > 0 && (
        <section className="notification_box">
          <div className="notification_wrapper">
            <h3>
              <IoNotificationsCircleOutline />
            </h3>
            <div className="notification-content">
              <p>
                <strong>Action Required:</strong>{" "}
                There {pendingFaceCount === 1 ? "is" : "are"}{" "}
                <strong>{pendingFaceCount}</strong>{" "}
                student{pendingFaceCount === 1 ? "" : "s"} that{" "}
                {pendingFaceCount === 1 ? "needs" : "need"} face registration.
                Please complete their face enrollment to activate full system access.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="student-management">

        {/* ── CONTROLS ──────────────────────────────────────────────── */}
        <div className="controls">
          <button type="button" className="sort-button">
            <FiFilter className="sort-icon" />
            Sort
            <IoMdArrowDropdown className="dropdown-icon" />
          </button>

          <select
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="College of Nursing">College of Nursing</option>
            <option value="College of Engineering">College of Engineering</option>
            <option value="College of Education">College of Education</option>
            <option value="College of Computer Studies">College of Computer Studies</option>
            <option value="College of Business Administration">College of Business Administration</option>
            <option value="College of Arts and Sciences">College of Arts and Sciences</option>
            <option value="College of Hospitality Management">College of Hospitality Management</option>
          </select>

          <select
            className="filter-select"
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
          >
            <option value="">All Year Levels</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            className="filter-select"
            value={registrationDate}
            onChange={(e) => setRegistrationDate(e.target.value)}
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search by name or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button
            type="button"
            className="action-button import-button"
            onClick={handleImportClick}
          >
            <FiDownload className="button-icon" />
            Import
          </button>

          <button
            type="button"
            className="action-button add-button"
            onClick={handleAddClick}
          >
            <FiPlus className="button-icon" />
            Add
          </button>
        </div>

        {/* ── TABLE ─────────────────────────────────────────────────── */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">Loading students...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : (
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
                {currentStudents.length > 0 ? (
                  currentStudents.map((student, index) => (
                    <tr key={student.student_id}>
                      <td>{indexOfFirstRecord + index + 1}</td>
                      <td>{student.student_id || "N/A"}</td>
                      <td>{formatFullName(student)}</td>
                      <td>{student.college_department || "N/A"}</td>
                      <td>{student.year_level || "N/A"}</td>
                      <td>
                        <span
                          className={`status-badge ${getStatusBadgeClass(student.status)}`}
                        >
                          {student.status || "Unknown"}
                        </span>
                      </td>
                      <td>{formatDate(student.created_at)}</td>
                      <td className="action-cell">
                        <div className="action-buttons-text">
                          <button
                            className="action-text-btn edit-text-btn"
                            onClick={() => handleEdit(student.student_id)}
                          >
                            Edit
                          </button>
                          <button
                            className={`action-text-btn ${
                              student.status === "ACTIVE"
                                ? "deactivate-text-btn"
                                : "activate-text-btn"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.student_id, student.status)
                            }
                          >
                            {student.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINATION ────────────────────────────────────────────── */}
        {!loading && !error && filteredStudents.length > 0 && (
          <>
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <div className="page-numbers">{renderPageNumbers()}</div>
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
            <div className="results-count">
              Showing {indexOfFirstRecord + 1} to{" "}
              {Math.min(indexOfLastRecord, filteredStudents.length)} of{" "}
              {filteredStudents.length} students
            </div>
          </>
        )}
      </div>

      {/* ── REGISTER MODAL ────────────────────────────────────────── */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={handleCloseRegisterModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <RegisterStudent
              onClose={handleCloseRegisterModal}
              onSuccess={fetchStudents}
            />
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ──────────────────────────────────────────── */}
      {showImportModal && (
        <ImportStudent
          isOpen={showImportModal}
          onClose={handleCloseImportModal}
          onSuccess={handleImportSuccess}  // ← refreshes table + notification count
        />
      )}
    </div>
  );
}

export default Students;