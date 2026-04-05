import React, { useState } from 'react';
import { MdRestore } from 'react-icons/md';
import '../../../css/GlobalModal.css';
import '../../../css/SystemSettings.css';

const ROWS_PER_PAGE = 10;

function Archive() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedStudents, setArchivedStudents] = useState([
    {
      id: 1,
      studentId: '20210001',
      fullName: 'JUAN DELA CRUZ',
      college: 'College of Computer Studies',
      program: 'BS Information Technology',
      yearLevel: 3,
      status: 'Irregular',
      archivedDate: '2024-03-15',
      reason: 'Transferred to another school'
    },
    {
      id: 2,
      studentId: '20210002',
      fullName: 'MARIA SANTOS',
      college: 'College of Nursing',
      program: 'BS Nursing',
      yearLevel: 2,
      status: 'Regular',
      archivedDate: '2024-03-10',
      reason: 'Academic probation'
    }
  ]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoreCollege, setRestoreCollege] = useState('');
  const [restoreProgram, setRestoreProgram] = useState('');
  const [restoreYearLevel, setRestoreYearLevel] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = archivedStudents.filter((student) => {
    const matchesSearch = [student.studentId, student.fullName, student.program, student.college]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesCollege = college === '' || student.college === college;
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
    setRestoreCollege(student.college);
    setRestoreProgram(student.program);
    setRestoreYearLevel(student.yearLevel);
    setRestoreStatus(student.status);
  };

  const handleRestoreConfirm = () => {
    if (!restoreReason.trim()) {
      alert('Please provide a reason for restoration.');
      return;
    }
    if (!restoreCollege) {
      alert('Please select a college department.');
      return;
    }
    if (!restoreProgram.trim()) {
      alert('Please enter the program.');
      return;
    }
    if (!restoreYearLevel) {
      alert('Please enter the year level.');
      return;
    }
    if (!restoreStatus) {
      alert('Please select a status.');
      return;
    }
    
    setArchivedStudents((prev) => prev.filter((s) => s.id !== selectedStudent.id));
    alert(`Student "${selectedStudent.fullName}" has been restored successfully!`);
    setShowRestoreModal(false);
    setSelectedStudent(null);
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
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((student, idx) => (
                <tr key={student.id}>
                  <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                  <td>{student.studentId}</td>
                  <td>{student.fullName}</td>
                  <td>{student.college}</td>
                  <td>{student.program}</td>
                  <td>{student.yearLevel}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td>{student.archivedDate}</td>
                  <td>
                    <span className="reason-badge" title={student.reason}>
                      {student.reason.length > 20 ? `${student.reason.substring(0, 20)}...` : student.reason}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-restore"
                      onClick={() => handleRestoreClick(student)}
                      title="Restore student"
                    >
                      <MdRestore /> Restore
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="tab-empty">No archived students found.</td>
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
                  <div><strong>ID:</strong> {selectedStudent.studentId}</div>
                  <div><strong>Name:</strong> {selectedStudent.fullName}</div>
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
                <label className="modal-label">Program <span className="required">*</span></label>
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
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-field modal-full-width">
                <label className="modal-label">Reason for Restoration <span className="required">*</span></label>
                <textarea
                  className="modal-input"
                  placeholder="Enter reason for restoration..."
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowRestoreModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-save"
                onClick={handleRestoreConfirm}
              >
                <MdRestore style={{ marginRight: '5px' }} /> Restore Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Archive;