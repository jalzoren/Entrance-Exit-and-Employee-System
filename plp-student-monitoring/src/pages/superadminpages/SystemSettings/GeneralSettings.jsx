import React from 'react';

function GeneralSettings({ settings, onInputChange, onSave }) {
  return (
    <>
      <div className="settings-section">
        <h2 className="section-title">FACIAL RECOGNITION SETTINGS</h2>
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">RECOGNITION CONFIDENCE THRESHOLD</label>
            <span className="setting-description">Minimum match accuracy before entry is accepted</span>
          </div>
          <div className="setting-control">
            <div className="input-with-unit">
              <input type="number" name="recognitionConfidence" value={settings.recognitionConfidence} onChange={onInputChange} className="number-input" min="1" max="100" />
              <span className="unit">%</span>
            </div>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">RECOGNITION TIMEOUT</label>
            <span className="setting-description">Seconds before switching to manual ID fallback</span>
          </div>
          <div className="setting-control">
            <div className="input-with-unit">
              <input type="number" name="recognitionTimeout" value={settings.recognitionTimeout} onChange={onInputChange} className="number-input" min="5" max="60" />
              <span className="unit">seconds</span>
            </div>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">RE-SCAN COOLDOWN</label>
            <span className="setting-description">Prevents duplicate log entries for same student</span>
          </div>
          <div className="setting-control">
            <div className="input-with-unit">
              <input type="number" name="rescanCooldown" value={settings.rescanCooldown} onChange={onInputChange} className="number-input" min="1" max="60" />
              <span className="unit">minutes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">MANUAL ID INPUT SETTINGS</h2>
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">MANUAL INPUT TIME LIMIT</label>
            <span className="setting-description">Seconds given to a student to type their ID</span>
          </div>
          <div className="setting-control">
            <div className="input-with-unit">
              <input type="number" name="manualInputTimeLimit" value={settings.manualInputTimeLimit} onChange={onInputChange} className="number-input" min="5" max="120" />
              <span className="unit">seconds</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">GATE SETTINGS</h2>
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">CAMPUS ENTRY WINDOW</label>
            <span className="setting-description">Allowed time range for student entry</span>
          </div>
          <div className="setting-control">
            <div className="time-range">
              <input type="time" name="entryWindowStart" value={settings.entryWindowStart} onChange={onInputChange} className="time-input" />
              <span className="time-separator">to</span>
              <input type="time" name="entryWindowEnd" value={settings.entryWindowEnd} onChange={onInputChange} className="time-input" />
            </div>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">CAMPUS EXIT WINDOW</label>
            <span className="setting-description">Allowed time range for student exit</span>
          </div>
          <div className="setting-control">
            <div className="time-range">
              <input type="time" name="exitWindowStart" value={settings.exitWindowStart} onChange={onInputChange} className="time-input" />
              <span className="time-separator">to</span>
              <input type="time" name="exitWindowEnd" value={settings.exitWindowEnd} onChange={onInputChange} className="time-input" />
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
              <input type="checkbox" name="blockEntryOutsideWindow" checked={settings.blockEntryOutsideWindow} onChange={onInputChange} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="save-settings">
        <button className="save-button" onClick={onSave}>SAVE SETTINGS</button>
      </div>
    </>
  );
}

export default GeneralSettings;