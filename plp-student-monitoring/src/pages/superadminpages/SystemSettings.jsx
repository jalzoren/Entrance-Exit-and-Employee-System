import React, { useState } from 'react';
import '../../css/SystemSettings.css'; // We'll create this CSS file

function SystemSettings() {
  const [settings, setSettings] = useState({
    recognitionConfidence: 85,
    rescanCooldown: 5,
    manualInputTimeLimit: 30,
    recognitionTimeout: 10,
    entryWindowStart: '06:00',
    entryWindowEnd: '21:00',
    exitWindowStart: '06:00',
    exitWindowEnd: '23:00',
    blockEntryOutsideWindow: true
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    console.log('Settings saved:', settings);
    // Add your save logic here
    alert('Settings saved successfully!');
  };

  return (
    <div className="system-settings">
      <header className="header-card">
        <h1>SYSTEM SETTINGS</h1>
        <p className="subtitle">Dashboard / System Settings</p>
      </header>
      
      <hr className="header-divider" />

      <div className="settings-container">
        {/* Settings Tabs */}
        <div className="settings-tabs">
          <button className="tab active">General Settings</button>
          <button className="tab">Archive</button>
          <button className="tab">Edit Program</button>
          <button className="tab">Regular and Irregular</button>
        </div>

        {/* Facial Recognition Settings */}
        <div className="settings-section">
          <h2 className="section-title">FACIAL RECOGNITION SETTINGS</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">RECOGNITION CONFIDENCE THRESHOLD</label>
              <span className="setting-description">Minimum match accuracy before entry is accepted</span>
            </div>
            <div className="setting-control">
          
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">RE-SCAN COOLDOWN</label>
              <span className="setting-description">Prevents duplicate log entries for same student</span>
            </div>
            <div className="setting-control">
              <div className="input-with-unit">
                <input
                  type="number"
                  name="rescanCooldown"
                  value={settings.rescanCooldown}
                  onChange={handleInputChange}
                  className="number-input"
                  min="1"
                  max="60"
                />
                <span className="unit">minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Manual ID Input Settings */}
        <div className="settings-section">
          <h2 className="section-title">MANUAL ID INPUT SETTINGS</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">MANUAL INPUT TIME LIMIT</label>
              <span className="setting-description">Seconds given to a student to type their ID</span>
            </div>
            <div className="setting-control">
              <div className="input-with-unit">
                <input
                  type="number"
                  name="manualInputTimeLimit"
                  value={settings.manualInputTimeLimit}
                  onChange={handleInputChange}
                  className="number-input"
                  min="5"
                  max="120"
                />
                <span className="unit">seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gate Settings */}
        <div className="settings-section">
          <h2 className="section-title">GATE SETTINGS</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">CAMPUS ENTRY WINDOW</label>
              <span className="setting-description">Allowed time range for student entry</span>
            </div>
            <div className="setting-control">
              <div className="time-range">
                <input
                  type="time"
                  name="entryWindowStart"
                  value={settings.entryWindowStart}
                  onChange={handleInputChange}
                  className="time-input"
                />
                <span className="time-separator">to</span>
                <input
                  type="time"
                  name="entryWindowEnd"
                  value={settings.entryWindowEnd}
                  onChange={handleInputChange}
                  className="time-input"
                />
              </div>
            </div>
          </div>

          <div className="setting-item checkbox-item">
            <div className="setting-info">
              <label className="setting-label">Block Entry Outside Entry Window</label>
              <span className="setting-description">System restricts scanning outside the defined entry time range</span>
            </div>
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="blockEntryOutsideWindow"
                  checked={settings.blockEntryOutsideWindow}
                  onChange={handleInputChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Recognition Timeout */}
        <div className="settings-section">
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">RECOGNITION TIMEOUT</label>
              <span className="setting-description">Seconds before switching to manual ID fallback</span>
            </div>
            <div className="setting-control">
              <div className="input-with-unit">
                <input
                  type="number"
                  name="recognitionTimeout"
                  value={settings.recognitionTimeout}
                  onChange={handleInputChange}
                  className="number-input"
                  min="5"
                  max="60"
                />
                <span className="unit">seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Manual ID Input Timer - Duplicate from above but keeping as per design */}
        <div className="settings-section">
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">MANUAL ID INPUT TIMER</label>
              <span className="setting-description">Seconds given to a student to type their ID</span>
            </div>
            <div className="setting-control">
              <div className="input-with-unit">
                <input
                  type="number"
                  name="manualInputTimeLimit"
                  value={settings.manualInputTimeLimit}
                  onChange={handleInputChange}
                  className="number-input"
                  min="5"
                  max="120"
                />
                <span className="unit">seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gate Exit Window */}
        <div className="settings-section">
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">GATE EXIT WINDOW</label>
              <span className="setting-description">Allowed time range for student exit</span>
            </div>
            <div className="setting-control">
              <div className="time-range">
                <input
                  type="time"
                  name="exitWindowStart"
                  value={settings.exitWindowStart}
                  onChange={handleInputChange}
                  className="time-input"
                />
                <span className="time-separator">to</span>
                <input
                  type="time"
                  name="exitWindowEnd"
                  value={settings.exitWindowEnd}
                  onChange={handleInputChange}
                  className="time-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="save-settings">
          <button className="save-button" onClick={handleSave}>
            SAVE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}

export default SystemSettings;