import React, { useState } from 'react';
import EditProgramModal from './EditProgramModal';
import AddProgramModal from './AddProgramModal';

const ROWS_PER_PAGE = 10;

function EditProgramTab() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [programType, setProgramType] = useState('Undergraduate');
  const [programStatus, setProgramStatus] = useState('Active');
  const [currentPage, setCurrentPage] = useState(1);
  const [programs, setPrograms] = useState([
    { id: 1, programCode: 'BSCS', programName: 'Bachelor of Science in Computer Science', department: 'College of Computer Studies', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
    { id: 2, programCode: 'BSIT', programName: 'Bachelor of Science in Information Technology', department: 'College of Computer Studies', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
    { id: 3, programCode: 'MSCS', programName: 'Master of Science in Computer Science', department: 'College of Computer Studies', programType: 'Graduate', programStatus: 'Inactive', dateCreated: '2023-08-15' },
    { id: 4, programCode: 'BSECE', programName: 'Bachelor of Science in Electronics Engineering', department: 'College of Engineering', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
    { id: 7, programCode: 'BSN', programName: 'Bachelor of Science in Nursing', department: 'College of Nursing', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
  ]);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = programs.filter((p) => {
    const matchesSearch = [p.programCode, p.programName, p.department]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesCollege = college === '' || p.department === college;
    const matchesType = p.programType === programType;
    const matchesStatus = p.programStatus === programStatus;
    return matchesSearch && matchesCollege && matchesType && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSaveEdit = (updated) => {
    setPrograms((prev) => prev.map((p) => (p.id === editingProgram.id ? { ...p, ...updated } : p)));
  };

  const handleAddProgram = (newProg) => {
    setPrograms((prev) => [...prev, { ...newProg, id: Date.now(), dateCreated: new Date().toISOString().split('T')[0] }]);
  };

  return (
    <div className="edit-program-tab">
      <div className="ep-topbar">
        <input type="text" className="ep-search" placeholder="Search" value={search} onChange={handleSearchChange} />
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
        <select value={programType} onChange={(e) => setProgramType(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}>
          <option value="Undergraduate">Undergraduate</option>
          <option value="Graduate">Graduate</option>
        </select>
        <select value={programStatus} onChange={(e) => setProgramStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button className="ep-add-btn" onClick={() => setShowAddModal(true)}>+ Add New Program</button>
      </div>

      <div className="ep-table-wrapper">
        <table className="ep-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Program Code</th>
              <th>Program Name</th>
              <th>College/Department</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date Created</th>
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
                  <td><span className={`type-badge ${prog.programType === 'Graduate' ? 'graduate' : 'undergrad'}`}>{prog.programType}</span></td>
                  <td><span className={`status-badge ${prog.programStatus === 'Active' ? 'active' : 'inactive'}`}>{prog.programStatus}</span></td>
                  <td>{prog.dateCreated}</td>
                  <td><button className="ep-edit-btn" onClick={() => setEditingProgram(prog)}>Edit</button></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="ep-empty">No programs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ep-pagination">
        <button className="ep-page-btn ep-page-nav" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
          ← Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button key={page} className={`ep-page-btn ep-page-num ${safePage === page ? 'ep-page-active' : ''}`} onClick={() => setCurrentPage(page)}>
            {page}
          </button>
        ))}
        <button className="ep-page-btn ep-page-nav" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
          Next →
        </button>
      </div>

      {editingProgram && (
        <EditProgramModal
          program={editingProgram}
          onClose={() => setEditingProgram(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showAddModal && (
        <AddProgramModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddProgram}
        />
      )}
    </div>
  );
}

export default EditProgramTab;