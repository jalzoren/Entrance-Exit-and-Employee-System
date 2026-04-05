import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { MdRestore } from 'react-icons/md';
import '../../../css/GlobalModal.css';
import '../../../css/SystemSettings.css';

const ROWS_PER_PAGE = 10;

function Archive() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoreCollege, setRestoreCollege] = useState('');
  const [restoreProgram, setRestoreProgram] = useState('');
  const [restoreYearLevel, setRestoreYearLevel] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoring, setRestoring] = useState(false);

  // ── Fetch archived students on component mount ──────────────────────────
  useEffect(() => {
    fetchArchivedStudents();
  }, []);

  const fetchArchivedStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/archived-students');
      setArchivedStudents(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching archived students:', err);
      setError(err.response?.data?.message || 'Failed to load archived students');
      setArchivedStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = archivedStudents.filter((student) => {
    const fullName = `${student.last_name || ''}, ${student.first_name || ''}`;
    const matchesSearch = [student.student_id, fullName, student.college_department]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesCollege = college === '' || student.college_department === college;
    const matchesStatus = statusFilter === '' || student.status === statusFilter;
    return matchesSearch && matchesCollege && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleRestoreClick = (student) => {
    setSelectedStudent(student);
    setShowRestoreModal(true);
    setRestoreReason('');
    setRestoreCollege(student.college_department);
    setRestoreProgram(student.program_name || '');
    setRestoreYearLevel(student.year_level);
    setRestoreStatus(student.status === 'Inactive' ? 'Regular' : student.status);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreCollege) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please select a college department.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
    if (!restoreYearLevel) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please enter the year level.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
    if (!restoreStatus) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please select a status.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      setRestoring(true);
      
      // Send restore request to backend
      await axios.put(`http://localhost:5000/api/students/${selectedStudent.student_id}`, {
        first_name: selectedStudent.first_name,
        last_name: selectedStudent.last_name,
        middle_name: selectedStudent.middle_name || '',
        extension_name: selectedStudent.extension_name || '',
        college_department: restoreCollege,
        program_name: restoreProgram,
        year_level: restoreYearLevel,
        status: restoreStatus
      });

      // Remove from archived list
      setArchivedStudents((prev) => prev.filter((s) => s.student_id !== selectedStudent.student_id));
      
      Swal.fire({
        title: 'Success',
        html: `<p><strong>${selectedStudent.first_name} ${selectedStudent.last_name}</strong> has been restored successfully!</p>`,
        icon: 'success',
        confirmButtonText: 'Done'
      });

      setShowRestoreModal(false);
      setSelectedStudent(null);
      setRestoreReason('');
      
    } catch (err) {
      console.error('Restore error:', err);
      Swal.fire({
        title: 'Restore Failed',
        text: err.response?.data?.message || 'Something went wrong. Please try again.',
        icon: 'error',
        confirmButtonText: 'Try Again'
      });
    } finally {
      setRestoring(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status.toLowerCase()) {
      case 'regular': return 'status-regular';
      case 'irregular': return 'status-irregular';
      case 'inactive': return 'status-inactive';
      default: return '';
    }
  };

  return (
    <div className="archive-tab">
      {/* Search and Filter Bar */}
      <div className="tab-topbar">
        <input
          type="text"
          className="tab-search"
          placeholder="Search by Student ID, Name, Program..."
          value={search}
          onChange={handleSearchChange}
        />
        <select 
          value={college} 
          onChange={(e) => setCollege(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        >
          <option value="">All Colleges</option>
          <option value="College of Nursing">College of Nursing</option>
          <option value="College of Engineering">College of Engineering</option>
          <option value="College of Education">College of Education</option>
          <option value="College of Computer Studies">College of Computer Studies</option>
          <option value="College of Arts and Science">College of Arts and Science</option>
          <option value="College of Business and Accountancy">College of Business and Accountancy</option>
          <option value="College of Hospitality Management">College of Hospitality Management</option>
        </select>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        >
          <option value="">All Status</option>
          <option value="Regular">Regular</option>
          <option value="Irregular">Irregular</option>
          <option value="Inactive">Inactive</option>
        </select>
        <span className="result-count">Total: {filtered.length}</span>
      </div>

      {/* Table */}
      <div className="tab-table-wrapper">
        <table className="tab-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>College/Department</th>
              <th>Program</th>
              <th>Year Level</th>
              <th>Status</th>
              <th>Archived Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="tab-empty">Loading archived students...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="tab-empty" style={{ color: 'red' }}>Error: {error}</td>
              </tr>
            ) : paginated.length > 0 ? (
              paginated.map((student, idx) => {
                const fullName = `${student.last_name || ''}, ${student.first_name || ''}`.trim();
                return (
                  <tr key={student.student_id}>
                    <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                    <td>{student.student_id}</td>
                    <td>{fullName}</td>
                    <td>{student.college_department}</td>
                    <td>
                      <span title={student.program_name || 'No program'} style={{ cursor: 'pointer' }}>
                        {student.program_name ? (student.program_name.length > 25 ? `${student.program_name.substring(0, 25)}...` : student.program_name) : 'N/A'}
                      </span>
                    </td>
                    <td>{student.year_level}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(student.status)}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>{student.updated_at ? new Date(student.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : 'N/A'}</td>
                    <td>
                      <button
                        className="btn-restore"
                        onClick={() => handleRestoreClick(student)}
                        title="Restore student"
                        disabled={restoring}
                      >
                        <MdRestore /> Restore
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="tab-empty">No archived students found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="tab-pagination">
        <button
          className="page-btn page-nav"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          ← Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`page-btn page-num ${safePage === page ? 'page-active' : ''}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
        <button
          className="page-btn page-nav"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          Next →
        </button>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Restore Student</h2>
              <button className="modal-close" onClick={() => setShowRestoreModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-field modal-full-width">
                <label className="modal-label">Student to Restore</label>
                <div style={{
                  padding: '12px 14px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  <div><strong>ID:</strong> {selectedStudent.student_id}</div>
                  <div><strong>Name:</strong> {selectedStudent.last_name}, {selectedStudent.first_name}</div>
                </div>
              </div>

              <div className="modal-field modal-full-width">
                <label className="modal-label">College Department <span className="required">*</span></label>
                <select
                  value={restoreCollege}
                  onChange={(e) => setRestoreCollege(e.target.value)}
                  className="modal-input"
                  style={{ height: 'auto', padding: '10px' }}
                >
                  <option value="">Select College Department</option>
                  <option value="College of Nursing">College of Nursing</option>
                  <option value="College of Engineering">College of Engineering</option>
                  <option value="College of Education">College of Education</option>
                  <option value="College of Computer Studies">College of Computer Studies</option>
                  <option value="College of Arts and Science">College of Arts and Science</option>
                  <option value="College of Business and Accountancy">College of Business and Accountancy</option>
                  <option value="College of Hospitality Management">College of Hospitality Management</option>
                </select>
              </div>

              <div className="modal-field modal-full-width">
                <label className="modal-label">Program</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g., Bachelor of Science in Information Technology"
                  value={restoreProgram}
                  onChange={(e) => setRestoreProgram(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div className="modal-field" style={{ flex: 1 }}>
                  <label className="modal-label">Year Level <span className="required">*</span></label>
                  <input
                    type="number"
                    className="modal-input"
                    placeholder="1-4"
                    value={restoreYearLevel}
                    onChange={(e) => setRestoreYearLevel(e.target.value)}
                    min="1"
                    max="4"
                  />
                </div>

                <div className="modal-field" style={{ flex: 1 }}>
                  <label className="modal-label">Status <span className="required">*</span></label>
                  <select
                    value={restoreStatus}
                    onChange={(e) => setRestoreStatus(e.target.value)}
                    className="modal-input"
                    style={{ height: 'auto', padding: '10px' }}
                  >
                    <option value="">Select Status</option>
                    <option value="Regular">Regular</option>
                    <option value="Irregular">Irregular</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowRestoreModal(false)}
                disabled={restoring}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-save"
                onClick={handleRestoreConfirm}
                disabled={restoring}
              >
                {restoring ? 'Restoring...' : (<><MdRestore style={{ marginRight: '5px' }} /> Restore Student</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Archive;