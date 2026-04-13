import React, { useState, useEffect } from 'react';
import EditProgramModal from './EditProgramModal';
import AddProgramModal from './AddProgramModal';
import Swal from 'sweetalert2';

const ROWS_PER_PAGE = 10;

function EditProgramTab() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [programType, setProgramType] = useState('All');
  const [programStatus, setProgramStatus] = useState('Active');
  const [currentPage, setCurrentPage] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch departments from backend
  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/departments');
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fetch programs from backend
  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (college) params.append('department', college);
      if (programType && programType !== 'All') params.append('programType', programType);
      params.append('programStatus', 'Active');
      
      const response = await fetch(`http://localhost:5000/api/programs?${params}`);
      const data = await response.json();
      setPrograms(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching programs:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load programs',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [search, college, programType]);

  const filtered = programs;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSaveEdit = async (updated) => {
    Swal.fire({
      title: 'Updating...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const response = await fetch(`http://localhost:5000/api/programs/${editingProgram.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      await fetchPrograms();
      setEditingProgram(null);
      
      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Program has been updated successfully.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error updating program:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed!',
        text: 'Failed to update program',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const handleAddProgram = async (newProg) => {
    await fetchPrograms();
  };

  const handleDepartmentAdded = async (updatedDepartments) => {
    setDepartments(updatedDepartments);
  };

  const handleArchive = async (program) => {
    const result = await Swal.fire({
      title: 'Archive Program?',
      text: `Are you sure you want to archive "${program.programName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, archive it!'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Archiving...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await fetch(`http://localhost:5000/api/programs/${program.id}/archive`, {
          method: 'PATCH'
        });
        
        if (!response.ok) throw new Error('Failed to archive');
        
        setPrograms((prev) => prev.filter((p) => p.id !== program.id));
        
        Swal.fire({
          icon: 'success',
          title: 'Archived!',
          text: `"${program.programName}" has been archived.`,
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error archiving program:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed!',
          text: 'Failed to archive program',
          confirmButtonColor: '#3085d6'
        });
      }
    }
  };

  if (loading) {
    return <div className="edit-program-tab" style={{ padding: '20px', textAlign: 'center' }}>Loading programs...</div>;
  }

  return (
    <div className="edit-program-tab">
      <div className="ep-topbar">
        <input 
          type="text" 
          className="ep-search" 
          placeholder="Search" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
        <select 
          value={college} 
          onChange={(e) => setCollege(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.dept_name}>
              {dept.dept_name}
            </option>
          ))}
        </select>
        <select 
          value={programType} 
          onChange={(e) => setProgramType(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        >
          <option value="All">All Types</option>
          <option value="Undergraduate">Undergraduate</option>
          <option value="Graduate">Graduate</option>
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
              <th>Duration</th>
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
                  <td>{prog.duration} {prog.duration === 1 ? 'year' : 'years'}</td>
                  <td><span className={`status-badge ${prog.programStatus === 'Active' ? 'active' : 'inactive'}`}>{prog.programStatus}</span></td>
                  <td>{prog.dateCreated}</td>
                  <td>
                    <button className="ep-edit-btn" onClick={() => setEditingProgram(prog)}>Edit</button>
                    <button className="ep-archive-btn" onClick={() => handleArchive(prog)}>Archive</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="ep-empty">No programs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ep-pagination">
        <button 
          className="ep-page-btn ep-page-nav" 
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
          disabled={safePage === 1}
        >
          ← Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button 
            key={page} 
            className={`ep-page-btn ep-page-num ${safePage === page ? 'ep-page-active' : ''}`} 
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
        <button 
          className="ep-page-btn ep-page-nav" 
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} 
          disabled={safePage === totalPages}
        >
          Next →
        </button>
      </div>

      {editingProgram && (
        <EditProgramModal
          program={editingProgram}
          onClose={() => setEditingProgram(null)}
          onSave={handleSaveEdit}
          departments={departments}
          onDepartmentAdded={handleDepartmentAdded}
        />
      )}

      {showAddModal && (
        <AddProgramModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddProgram}
          departments={departments}
          onDepartmentAdded={handleDepartmentAdded}
        />
      )}
    </div>
  );
}

export default EditProgramTab;