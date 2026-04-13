// DepartmentsTab.jsx - Clean & Working Version
import React, { useState, useEffect } from 'react';
import AddDepartmentModal from './AddDepartmentModal';
import Swal from 'sweetalert2';

const ROWS_PER_PAGE = 10;

function DepartmentsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [currentPage, setCurrentPage] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editForm, setEditForm] = useState({
    dept_code: '',
    dept_name: '',
    status: 'Active'
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch departments
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('status', 'Active');

      const url = `http://localhost:5000/api/departments${params.toString() ? `?${params}` : ''}`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Raw API Response:", data);

      let departmentsArray = Array.isArray(data) ? data : (data.data || data.departments || []);

      // Convert string array to object array (temporary solution until backend is updated)
      if (departmentsArray.length > 0 && typeof departmentsArray[0] === 'string') {
        departmentsArray = departmentsArray.map((name, index) => ({
          id: `temp-${index}`,
          dept_code: '',
          dept_name: name,
          status: 'Active',
          created_at: null
        }));
      }

      setDepartments(departmentsArray);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching departments:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to load departments: ${error.message}`,
        confirmButtonColor: '#3085d6'
      });
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(departments.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDepartments = departments.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  const handleAddDepartment = async () => {
    await fetchDepartments();
  };

  const handleEditClick = (dept) => {
    setEditingDepartment(dept);
    setEditForm({
      dept_code: dept.dept_code || '',
      dept_name: dept.dept_name || (typeof dept === 'string' ? dept : ''),
      status: dept.status || 'Active'
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editForm.dept_code.trim() || !editForm.dept_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in all required fields.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    Swal.fire({
      title: 'Updating...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const deptId = editingDepartment.id || editingDepartment; // fallback

      const response = await fetch(`http://localhost:5000/api/departments/${deptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update department');
      }

      await fetchDepartments();
      setEditingDepartment(null);

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Department has been updated successfully.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error updating department:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed!',
        text: error.message || 'Failed to update department',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const handleArchive = async (dept) => {
    const deptName = typeof dept === 'string' ? dept : (dept.dept_name || 'this department');
    const deptId = typeof dept === 'string' ? dept : dept.id;

    // First check if department has active programs
    try {
        const programsResponse = await fetch(`http://localhost:5000/api/programs?department=${encodeURIComponent(deptName)}&programStatus=Active`);
        const activePrograms = await programsResponse.json();
        
        let message = `Are you sure you want to archive "${deptName}"?`;
        if (activePrograms.length > 0) {
            message = `"${deptName}" has ${activePrograms.length} active program(s):\n\n`;
            activePrograms.forEach(p => {
                message += `• ${p.programName} (${p.programCode})\n`;
            });
            message += `\nThese programs will also be archived. Continue?`;
        }

        const result = await Swal.fire({
            title: 'Archive Department?',
            text: message,
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
                didOpen: () => Swal.showLoading()
            });

            try {
                // Archive the department
                const response = await fetch(`http://localhost:5000/api/departments/${deptId}/archive`, {
                    method: 'PATCH'
                });

                if (!response.ok) throw new Error('Failed to archive department');

                // Archive all active programs in this department
                if (activePrograms.length > 0) {
                    for (const program of activePrograms) {
                        await fetch(`http://localhost:5000/api/programs/${program.id}/archive`, {
                            method: 'PATCH'
                        });
                    }
                }

                // Remove department from local state immediately
                setDepartments((prev) => prev.filter((d) => d.id !== deptId));

                Swal.fire({
                    icon: 'success',
                    title: 'Archived!',
                    html: `"${deptName}"${activePrograms.length > 0 ? ` and ${activePrograms.length} program(s)` : ''} has been archived.`,
                    timer: 2000,
                    showConfirmButton: false
                });
                
                // Refresh the page data to reflect changes
                fetchDepartments();
                
            } catch (error) {
                console.error('Error archiving department:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed!',
                    text: 'Failed to archive department',
                    confirmButtonColor: '#3085d6'
                });
            }
        }
    } catch (error) {
        console.error('Error checking active programs:', error);
        // If can't check programs, still allow archive
        const result = await Swal.fire({
            title: 'Archive Department?',
            text: `Are you sure you want to archive "${deptName}"?`,
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
                didOpen: () => Swal.showLoading()
            });

            try {
                const response = await fetch(`http://localhost:5000/api/departments/${deptId}/archive`, {
                    method: 'PATCH'
                });

                if (!response.ok) throw new Error('Failed to archive department');

                setDepartments((prev) => prev.filter((d) => d.id !== deptId));

                Swal.fire({
                    icon: 'success',
                    title: 'Archived!',
                    text: `"${deptName}" has been archived.`,
                    timer: 1500,
                    showConfirmButton: false
                });
                
                fetchDepartments();
                
            } catch (error) {
                console.error('Error archiving department:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed!',
                    text: 'Failed to archive department',
                    confirmButtonColor: '#3085d6'
                });
            }
        }
    }
};

  if (loading) {
    return <div className="edit-program-tab" style={{ padding: '20px', textAlign: 'center' }}>Loading departments...</div>;
  }

  return (
    <div className="edit-program-tab">
      <div className="ep-topbar">
        <input 
          type="text" 
          className="ep-search" 
          placeholder="Search departments..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
        <button className="ep-add-btn" onClick={() => setShowAddModal(true)}>+ Add New Department</button>
      </div>

      <div className="ep-table-wrapper">
        <table className="ep-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Department Code</th>
              <th>Department Name</th>
              <th>Status</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDepartments.length > 0 ? (
              paginatedDepartments.map((dept, idx) => {
                const isString = typeof dept === 'string';
                const deptName = isString ? dept : (dept.dept_name || 'Unnamed');
                const isActive = (dept.status || 'Active').toLowerCase() === 'active';

                return (
                  <tr key={dept.id || deptName || idx}>
                    <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                    <td>{isString ? 'N/A' : (dept.dept_code || 'N/A')}</td>
                    <td>{deptName}</td>
                    <td>
                      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                        {isString ? 'Active' : (dept.status || 'Active')}
                      </span>
                    </td>
                    <td>
                      {dept.created_at 
                        ? new Date(dept.created_at).toLocaleDateString() 
                        : 'N/A'}
                    </td>
                    <td>
                      <button 
                        className="ep-edit-btn" 
                        onClick={() => handleEditClick(dept)}
                        disabled={!isActive}
                      >
                        Edit
                      </button>
                      <button 
                        className="ep-archive-btn" 
                        onClick={() => handleArchive(dept)}
                        disabled={!isActive}
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="ep-empty">No departments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="ep-pagination">
          <button 
            className="ep-page-btn ep-page-nav" 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={safePage === 1}
          >
            ← Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={safePage === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDepartment && (
        <div className="modal-overlay" onClick={() => setEditingDepartment(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Department</h2>
              <button className="modal-close" onClick={() => setEditingDepartment(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-grid-2">
                <div className="modal-field">
                  <label className="modal-label">Department Code <span className="required">*</span></label>
                  <input 
                    type="text" 
                    name="dept_code"
                    value={editForm.dept_code} 
                    onChange={handleEditChange} 
                    className="modal-input" 
                  />
                </div>

                <div className="modal-field">
                  <label className="modal-label">Department Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    name="dept_name"
                    value={editForm.dept_name} 
                    onChange={handleEditChange} 
                    className="modal-input" 
                  />
                </div>

                <div className="modal-field">
                  <label className="modal-label">Status</label>
                  <select 
                    name="status"
                    value={editForm.status} 
                    onChange={handleEditChange} 
                    className="modal-select"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setEditingDepartment(null)}>
                Cancel
              </button>
              <button className="modal-btn modal-btn-save" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <AddDepartmentModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddDepartment}
        />
      )}
    </div>
  );
}

export default DepartmentsTab;