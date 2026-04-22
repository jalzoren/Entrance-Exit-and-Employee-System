// SystemSettings.jsx
import React, { useState } from 'react';
import GeneralSettings     from './GeneralSettings';   // ← now contains Gate + Academic Year
import EditProgramTab      from './EditProgramTab';
import ArchivedStudents    from './ArchivedStudents';
import ArchivedPrograms    from './ArchivedPrograms';
import ArchivedDepartments from './ArchivedDepartments';
import DepartmentsTab      from './DepartmentsTab';
import "../../../css/SystemSettings.css";
import "../../../css/GeneralSettings.css";

const TABS = [
  'General Settings',
  'Departments',
  'Programs',
  'Archived Students',
  'Archived Programs',
  'Archived Departments',
];

function SystemSettings() {
  const [activeTab, setActiveTab] = useState('General Settings');

  return (
    <div>
      <header className="header-card">
        <h1>SYSTEM SETTINGS</h1>
        <p className="subtitle">Dashboard / System Settings</p>
      </header>

      <div className="system-settings">
        <div className="settings-container">

          {/* ── Tab bar ── */}
          <div className="settings-tabs">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          {activeTab === 'General Settings'    && <GeneralSettings />}
          {activeTab === 'Departments'          && <DepartmentsTab />}
          {activeTab === 'Programs'             && <EditProgramTab />}
          {activeTab === 'Archived Students'    && <ArchivedStudents />}
          {activeTab === 'Archived Programs'    && <ArchivedPrograms />}
          {activeTab === 'Archived Departments' && <ArchivedDepartments />}

        </div>
      </div>
    </div>
  );
}

export default SystemSettings;