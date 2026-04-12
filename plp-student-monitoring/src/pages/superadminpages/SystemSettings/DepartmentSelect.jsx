import React from 'react';

function DepartmentSelect({ 
  value, 
  onChange, 
  departments = [], 
  placeholder = "Select Department",
  disabled = false 
}) {
  return (
    <div className="dept-select-container">
      <div className="modal-select-wrapper">
        <select
          name="department"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="modal-select"
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          
          {departments.map((dept) => {
            // Handle both object format (from DB) and string fallback
            const deptName = typeof dept === 'object' ? dept.dept_name : dept;
            const deptId = typeof dept === 'object' ? dept.id : deptName;

            return (
              <option 
                key={deptId || deptName} 
                value={deptName}
              >
                {deptName}
              </option>
            );
          })}
        </select>
        <span className="select-arrow">▾</span>
      </div>
    </div>
  );
}

export default DepartmentSelect;