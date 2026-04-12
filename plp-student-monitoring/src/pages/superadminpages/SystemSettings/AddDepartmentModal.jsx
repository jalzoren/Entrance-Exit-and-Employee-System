// AddDepartmentModal.jsx
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import '../../../css/GlobalModal.css';

function AddDepartmentModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    dept_code: '',
    dept_name: '',
    status: 'Active'
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async () => {
    if (isAdding) return;

    if (!form.dept_code.trim() || !form.dept_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in Department Code and Department Name.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    setIsAdding(true);

    Swal.fire({
      title: 'Adding Department...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const response = await fetch('http://localhost:5000/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add department');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Department Added!',
        text: `${form.dept_name} has been added successfully.`,
        timer: 2000,
        showConfirmButton: false
      });

      onClose();
      if (onAdd) onAdd();
    } catch (error) {
      console.error('Error adding department:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed!',
        text: error.message || 'Could not add department. It might already exist.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Department</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid-2">
            <div className="modal-field">
              <label className="modal-label">Department Code <span className="required">*</span></label>
              <input
                type="text"
                name="dept_code"
                value={form.dept_code}
                onChange={handleChange}
                className="modal-input"
                placeholder="e.g. CCS"
                autoFocus
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Status <span className="required">*</span></label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="modal-select"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">Department Name <span className="required">*</span></label>
            <input
              type="text"
              name="dept_name"
              value={form.dept_name}
              onChange={handleChange}
              className="modal-input"
              placeholder="e.g. College of Computer Studies"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            className="modal-btn modal-btn-save" 
            onClick={handleAdd} 
            disabled={isAdding}
          >
            {isAdding ? 'Adding...' : 'Add Department'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddDepartmentModal;