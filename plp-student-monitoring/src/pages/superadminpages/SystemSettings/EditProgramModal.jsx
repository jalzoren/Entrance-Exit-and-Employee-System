import React, { useState } from 'react';
import DepartmentSelect from './DepartmentSelect';
import '../../../css/GlobalModal.css';

function EditProgramModal({ program, onClose, onSave, departments, onAddDepartment }) {
  const [form, setForm] = useState({
    programCode: program?.programCode || '',
    programName: program?.programName || '',
    department: program?.department || '',
    programType: program?.programType || 'Undergraduate',
    programStatus: program?.programStatus || 'Active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!form.programCode || !form.programName || !form.department) {
      alert('Please fill in all required fields.');
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Program</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid-2">
            <div className="modal-field">
              <label className="modal-label">Program Code <span className="required">*</span></label>
              <input type="text" name="programCode" value={form.programCode} onChange={handleChange} className="modal-input" placeholder="e.g. BSCS" />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Name <span className="required">*</span></label>
              <input type="text" name="programName" value={form.programName} onChange={handleChange} className="modal-input" placeholder="e.g. Bachelor of Science in Computer Science" />
            </div>

            <div className="modal-field modal-full-width">
              <label className="modal-label">Department <span className="required">*</span></label>
              <DepartmentSelect
                value={form.department}
                onChange={(val) => setForm((prev) => ({ ...prev, department: val }))}
                departments={departments}
                onAddDepartment={onAddDepartment}
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Type <span className="required">*</span></label>
              <select name="programType" value={form.programType} onChange={handleChange} className="modal-select">
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Status <span className="required">*</span></label>
              <select name="programStatus" value={form.programStatus} onChange={handleChange} className="modal-select">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default EditProgramModal;