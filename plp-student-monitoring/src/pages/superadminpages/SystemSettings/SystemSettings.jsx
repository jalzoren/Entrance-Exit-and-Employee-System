import React, { useState } from 'react';
import GeneralSettings from './GeneralSettings';
import EditProgramTab from './EditProgramTab';
import Archive from './Archive';
import Irregular from './Irregular';
import "../../../css/SystemSettings.css";
function SystemSettings() {
  const [activeTab, setActiveTab] = useState('General Settings');
  const [settings, setSettings] = useState({
    recognitionConfidence: 85,
    rescanCooldown: 5,
    manualInputTimeLimit: 30,
    recognitionTimeout: 10,
    entryWindowStart: '06:00',
    entryWindowEnd: '21:00',
    exitWindowStart: '06:00',
    exitWindowEnd: '23:00',
    blockEntryOutsideWindow: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveSettings = () => {
    alert('Settings saved successfully!');
  };

  const tabs = ['General Settings', 'Archive', 'Edit Program', 'Regular and Irregular'];

  return (
    <div>
      <header className="header-card">
        <h1>SYSTEM SETTINGS</h1>
        <p className="subtitle">Dashboard / System Settings</p>
      </header>

          <div className="system-settings">

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button 
              key={tab} 
              className={`tab ${activeTab === tab ? 'active' : ''}`} 
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'General Settings' && (
          <GeneralSettings 
            settings={settings} 
            onInputChange={handleInputChange} 
            onSave={handleSaveSettings} 
          />
        )}

        {activeTab === 'Edit Program' && <EditProgramTab />}

        {activeTab === 'Archive' && <Archive />}

        {activeTab === 'Regular and Irregular' && <Irregular />}
      </div>
    </div>
    </div>
  );
}

export default SystemSettings;