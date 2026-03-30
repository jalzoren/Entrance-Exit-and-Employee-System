import React, { useState } from 'react';
import { MdRestore } from 'react-icons/md';
import '../../../css/GlobalModal.css';
import '../../../css/SystemSettings.css';

const ROWS_PER_PAGE = 10;

function Archive() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedPrograms, setArchivedPrograms] = useState([
    
  ]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoreCollege, setRestoreCollege] = useState('');

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = archivedPrograms.filter((p) => {
    const matchesSearch = [p.programCode, p.programName, p.department]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesCollege = college === '' || p.department === college;
    return matchesSearch && matchesCollege;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleRestoreClick = (program) => {
    setSelectedProgram(program);
    setShowRestoreModal(true);
    setRestoreReason('');
    setRestoreCollege('');
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
    setArchivedPrograms((prev) => prev.filter((p) => p.id !== selectedProgram.id));
    alert(`Program "${selectedProgram.programName}" has been restored successfully!`);
    setShowRestoreModal(false);
    setSelectedProgram(null);
  };

  const handleDepartmentChange = (progId, newDepartment) => {
    setArchivedPrograms((prev) =>
      prev.map((p) =>
        p.id === progId ? { ...p, department: newDepartment } : p
      )
    );
  };

  return (
    <div className="archive-tab">
      {/* Search Bar */}
      <div className="tab-topbar">
        <input
          type="text"
          className="tab-search"
          placeholder="Search archived programs..."
          value={search}
          onChange={handleSearchChange}
        />
        <select value={college} onChange={(e) => setCollege(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}>
          <option value="">Select College Department</option>
          <option value="College of Nursing">College of Nursing</option>
          <option value="College of Engineering">College of Engineering</option>
          <option value="College of Education">College of Education</option>
          <option value="College of Computer Studies">College of Computer Studies</option>
          <option value="College of Arts and Science">College of Arts and Science</option>
          <option value="College of Business and Accountancy">College of Business and Accountancy</option>
          <option value="College of Hospitality Management">College of Hospitality Management</option>
        </select>
        <span className="result-count">Total: {filtered.length}</span>
      </div>

      {/* Table */}
      <div className="tab-table-wrapper">
        <table className="tab-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Program Code</th>
              <th>Program Name</th>
              <th>Department</th>
              <th>Archived Date</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((prog, idx) => (
                <tr key={prog.id}>
                  <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                  <td>{prog.programCode}</td>
                  <td>{prog.programName}</td>
                  <td>
                    <select
                      value={prog.department}
                      onChange={(e) => handleDepartmentChange(prog.id, e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '100%' }}
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
                  </td>
                  <td>{prog.archivedDate}</td>
                  <td><span className="reason-badge">{prog.reason}</span></td>
                  <td>
                    <button
                      className="btn-restore"
                      onClick={() => handleRestoreClick(prog)}
                      title="Restore program"
                    >
                      <MdRestore /> Restore
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="tab-empty">No archived programs found.</td>
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
      {showRestoreModal && selectedProgram && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Restore Program</h2>
              <button className="modal-close" onClick={() => setShowRestoreModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-field modal-full-width">
                <label className="modal-label">Program to Restore</label>
                <div style={{
                  padding: '12px 14px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  {selectedProgram.programCode} - {selectedProgram.programName}
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
                Restore Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Archive;
