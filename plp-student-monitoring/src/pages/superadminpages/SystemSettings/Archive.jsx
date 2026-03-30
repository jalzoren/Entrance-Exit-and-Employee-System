import React, { useState } from 'react';
import { MdRestore } from 'react-icons/md';
import '../../../css/GlobalModal.css';
import '../../../css/SystemSettings.css';

const ROWS_PER_PAGE = 10;

function Archive() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedPrograms, setArchivedPrograms] = useState([
    { id: 1, programCode: 'BSBS', programName: 'Bachelor of Science in Biosciences', department: 'College of Science', archivedDate: '2023-01-15', reason: 'Discontinued' },
    { id: 2, programCode: 'BSCRIM', programName: 'Bachelor of Science in Criminology', department: 'College of Criminal Justice', archivedDate: '2023-03-20', reason: 'Low enrollment' },
    { id: 3, programCode: 'BSARCHITECTURE', programName: 'Bachelor of Science in Architecture', department: 'College of Engineering', archivedDate: '2023-05-10', reason: 'Program restructuring' },
  ]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = archivedPrograms.filter((p) =>
    [p.programCode, p.programName, p.department]
      .join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleRestoreClick = (program) => {
    setSelectedProgram(program);
    setShowRestoreModal(true);
    setRestoreReason('');
  };

  const handleRestoreConfirm = () => {
    if (!restoreReason.trim()) {
      alert('Please provide a reason for restoration.');
      return;
    }
    setArchivedPrograms((prev) => prev.filter((p) => p.id !== selectedProgram.id));
    alert(`Program "${selectedProgram.programName}" has been restored successfully!`);
    setShowRestoreModal(false);
    setSelectedProgram(null);
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
                  <td>{prog.department}</td>
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
