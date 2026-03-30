import React, { useState } from 'react';
import { MdClose, MdEdit } from 'react-icons/md';
import '../../../css/GlobalModal.css';

const ROWS_PER_PAGE = 10;

function RegularIrregularTab() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [students, setStudents] = useState([
    { id: 1, studentId: '24-00001', studentName: 'Juan Dela Cruz', college: 'College of Computer Studies', enrollmentStatus: 'Regular', yearLevel: '3rd Year' },
    { id: 2, studentId: '24-00002', studentName: 'Maria Santos', college: 'College of Engineering', enrollmentStatus: 'Irregular', yearLevel: '2nd Year' },
    { id: 3, studentId: '24-00003', studentName: 'Jose Rodriguez', college: 'College of Nursing', enrollmentStatus: 'Regular', yearLevel: '4th Year' },
    { id: 4, studentId: '24-00004', studentName: 'Ana Garcia', college: 'College of Business', enrollmentStatus: 'Irregular', yearLevel: '1st Year' },
    { id: 5, studentId: '24-00005', studentName: 'Carlos Reyes', college: 'College of Education', enrollmentStatus: 'Regular', yearLevel: '2nd Year' },
  ]);
  const [filterStatus, setFilterStatus] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ enrollmentStatus: '', yearLevel: '' });

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = students.filter((s) => {
    const matchesSearch = [s.studentId, s.studentName, s.college, s.yearLevel]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === '' || s.enrollmentStatus === filterStatus;
    const matchesCollege = college === '' || s.college === college;
    return matchesSearch && matchesStatus && matchesCollege;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setFormData({
      enrollmentStatus: student.enrollmentStatus,
      yearLevel: student.yearLevel
    });
    setShowEditModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = () => {
    if (!formData.enrollmentStatus || !formData.yearLevel) {
      alert('Please fill in all fields.');
      return;
    }
    setStudents((prev) =>
      prev.map((s) =>
        s.id === editingStudent.id
          ? { ...s, ...formData }
          : s
      )
    );
    alert(`Student "${editingStudent.studentName}" has been updated successfully!`);
    setShowEditModal(false);
    setEditingStudent(null);
  };

  const regularCount = students.filter((s) => s.enrollmentStatus === 'Regular').length;
  const irregularCount = students.filter((s) => s.enrollmentStatus === 'Irregular').length;

  return (
    <div className="regular-irregular-tab">
      {/* Stats */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-label">Regular Students</div>
          <div className="stat-value" style={{ color: '#548772' }}>{regularCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Irregular Students</div>
          <div className="stat-value" style={{ color: '#d99201' }}>{irregularCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Students</div>
          <div className="stat-value" style={{ color: '#01311d' }}>{students.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="tab-topbar">
        <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
          <input
            type="text"
            className="tab-search"
            placeholder="Search by ID, name, or college..."
            value={search}
            onChange={handleSearchChange}
          />
          <select
            className="filter-select"
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
            className="filter-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="Regular">Regular</option>
            <option value="Irregular">Irregular</option>
          </select>
        </div>
        <span className="result-count">Results: {filtered.length}</span>
      </div>

      {/* Table */}
      <div className="tab-table-wrapper">
        <table className="tab-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>College/Department</th>
              <th>Enrollment Status</th>
              <th>Year Level</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((student, idx) => (
                <tr key={student.id}>
                  <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                  <td>{student.studentId}</td>
                  <td>{student.studentName}</td>
                  <td>{student.college}</td>
                  <td>
                    <span
                      className={`status-badge ${student.enrollmentStatus === 'Regular' ? 'regular' : 'irregular'}`}
                    >
                      {student.enrollmentStatus}
                    </span>
                  </td>
                  <td>{student.yearLevel}</td>
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() => handleEditClick(student)}
                      title="Edit student"
                    >
                      <MdEdit /> Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="tab-empty">No students found.</td>
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

      {/* Edit Modal */}
      {showEditModal && editingStudent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Student Status</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-field modal-full-width">
                <label className="modal-label">Student</label>
                <div style={{
                  padding: '12px 14px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  {editingStudent.studentId} - {editingStudent.studentName}
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-field">
                  <label className="modal-label">Enrollment Status <span className="required">*</span></label>
                  <select
                    name="enrollmentStatus"
                    className="modal-select"
                    value={formData.enrollmentStatus}
                    onChange={handleFormChange}
                  >
                    <option value="">Select Status</option>
                    <option value="Regular">Regular</option>
                    <option value="Irregular">Irregular</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label className="modal-label">Year Level <span className="required">*</span></label>
                  <select
                    name="yearLevel"
                    className="modal-select"
                    value={formData.yearLevel}
                    onChange={handleFormChange}
                  >
                    <option value="">Select Year Level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-save"
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegularIrregularTab;
