import React, { useState, useEffect } from "react";
import "../css/Students.css";
import RegisterStudent from "../components/RegisterStudent";
import ImportStudent from "../components/ImportStudents";
import axios from "axios";
import { FiDownload, FiPlus, FiFilter } from "react-icons/fi";
import { IoMdArrowDropdown } from "react-icons/io";

function Students() {
  const [students, setStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [department, setDepartment] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // ================= FETCH STUDENTS =================
  const fetchStudents = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/students"
      );
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // ================= FILTERING =================
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name || ""} ${student.last_name || ""} ${
      student.middle_name || ""
    }`.toLowerCase();

    return (
      (department === "" ||
        student.college_department === department) &&
      (yearLevel === "" || student.year_level === yearLevel) &&
      (registrationDate === "" ||
        student.created_at?.includes(registrationDate)) &&
      (searchQuery === "" ||
        (student.student_id || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        fullName.includes(searchQuery.toLowerCase()))
    );
  });

  // ================= PAGINATION =================
  const recordsPerPage = 5;
  const totalPages = Math.ceil(
    filteredStudents.length / recordsPerPage
  );

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;

  const currentStudents = filteredStudents.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    document.body.style.overflow = "unset";
  };

  // ================= ACTIONS =================
  const handleEdit = (studentId) => {
    console.log("Edit:", studentId);
  };

  const handleDeactivate = (studentId, status) => {
    console.log("Toggle status:", studentId, status);
  };

  const handleViewPhoto = (studentId) => {
    console.log("View photo:", studentId);
  };

  return (
    <div>
      <header className="header-card">
        <h1>STUDENT MANAGEMENT</h1>
        <p className="subtitle">
          Dashboard / Student Management
        </p>
      </header>

      <hr className="header-divider" />

      <div className="student-management">

        {/* ================= CONTROLS ================= */}
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
            <option value="">Select College Department</option>
            <option value="College of Nursing">College of Nursing</option>
            <option value="College of Engineering">College of Engineering</option>
            <option value="College of Education">College of Education</option>
            <option value="College of Computer Studies">College of Computer Studies</option>
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

        {/* ================= TABLE ================= */}
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
              {currentStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
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
                      <span
                        className={`status-badge ${(student.status || "").toLowerCase()}`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td>{student.created_at?.split("T")[0]}</td>
                    <td>
                      <button onClick={() => handleEdit(student.student_id)}>Edit</button>
                      <button onClick={() => handleViewPhoto(student.student_id)}>View Photo</button>
                      <button
                        onClick={() =>
                          handleDeactivate(student.student_id, student.status)
                        }
                      >
                        {student.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= REGISTER MODAL ================= */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <RegisterStudent
              onClose={handleCloseRegisterModal}
              refreshTable={fetchStudents}
            />
          </div>
        </div>
      )}

      {/* ================= IMPORT MODAL ================= */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <ImportStudent
              onClose={handleCloseImportModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;