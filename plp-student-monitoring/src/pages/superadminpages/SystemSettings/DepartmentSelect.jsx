import React, { useState } from 'react';

function DepartmentSelect({ value, onChange, departments, onAddDepartment }) {
  const [showAddField, setShowAddField] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [error, setError] = useState('');

  const handleSelectChange = (e) => {
    if (e.target.value === '__add_new__') {
      setShowAddField(true);
      setNewDeptName('');
      setError('');
    } else {
      onChange(e.target.value);
    }
  };

  const handleConfirmAdd = () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) {
      setError('Department name cannot be empty.');
      return;
    }
    if (departments.map((d) => d.toLowerCase()).includes(trimmed.toLowerCase())) {
      setError('This department already exists.');
      return;
    }
    onAddDepartment(trimmed);
    onChange(trimmed);
    setShowAddField(false);
    setNewDeptName('');
    setError('');
  };

  const handleCancelAdd = () => {
    setShowAddField(false);
    setNewDeptName('');
    setError('');
  };

  return (
    <div className="dept-select-container">
      <div className="modal-select-wrapper">
        <select
          name="department"
          value={showAddField ? '__add_new__' : value}
          onChange={handleSelectChange}
          className="modal-select"
        >
          <option value="">Select department</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
          <option value="__add_new__">＋ Add New Department…</option>
        </select>
        <span className="select-arrow">▾</span>
      </div>

      {showAddField && (
        <div className="dept-add-panel">
          <p className="dept-add-title">New Department Name</p>
          <input
            type="text"
            className={`modal-input dept-add-input${error ? ' input-error' : ''}`}
            placeholder="e.g. College of Law"
            value={newDeptName}
            onChange={(e) => { setNewDeptName(e.target.value); setError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAdd();
              if (e.key === 'Escape') handleCancelAdd();
            }}
            autoFocus
          />
          {error && <p className="dept-add-error">{error}</p>}
          <div className="dept-add-actions">
            <button type="button" className="dept-btn-cancel" onClick={handleCancelAdd}>Cancel</button>
            <button type="button" className="dept-btn-confirm" onClick={handleConfirmAdd}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentSelect;