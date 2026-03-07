import React from 'react';
import './ccs/settings.css';

export default function Settings() {
  return (
      <div className="content-overlay">
        <div className="dashboard-container">

          <div className="dashboard-header">
            <h1 className="dashboard-title">Settings</h1>
            <p className="section-title">Administration</p>
          </div>

          <div className="settings-grid">

            {/* Left: Branding / Institution */}
            <section className="settings-card" aria-labelledby="branding-title">
              <div>
                <h2 id="branding-title" className="card-title">Branding</h2>
                <p className="card-subtitle">Logo and institution name</p>

                <div className="settings-branding">
                  <div className="settings-logo-preview" aria-hidden>
                    <img src="/placeholder-logo.png" alt="Logo preview" />
                  </div>

                  <div className="settings-actions">
                    <div className="settings-field">
                      <label htmlFor="logoUpload">Site logo</label>
                      <input id="logoUpload" className="settings-input" type="file" disabled aria-disabled="true" />
                      <small className="stat-sublabel">Upload control will be enabled when logic is wired.</small>
                    </div>

                    <div className="settings-field">
                      <label htmlFor="institutionName">Institution name</label>
                      <input id="institutionName" className="settings-input" type="text" defaultValue="College / Institution Name" readOnly aria-readonly="true" />
                      <div className="settings-row">
                        <button className="settings-btn settings-primary" type="button">Edit name</button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </section>

            {/* Right: Departments */}
            <section className="settings-card" aria-labelledby="departments-title">
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 id="departments-title" className="card-title">Departments</h2>
      <button className="settings-btn settings-primary" type="button">Add department</button>
    </div>

    <p className="card-subtitle">Manage departments (delete / add)</p>

    <div className="settings-dept-list">

      <div className="dept-item">
        <div className="dept-info">
          <div className="dept-title">Department of Computer Science</div>
          <div className="dept-meta">Short code: CS</div>
        </div>
        <div className="dept-actions">
          <button className="settings-btn settings-danger" type="button" disabled aria-disabled="true">Delete</button>
        </div>
      </div>

      <div className="dept-item">
        <div className="dept-info">
          <div className="dept-title">Department of Mathematics</div>
          <div className="dept-meta">Short code: MATH</div>
        </div>
        <div className="dept-actions">
          <button className="settings-btn settings-danger" type="button" disabled aria-disabled="true">Delete</button>
        </div>
      </div>

    </div>
  </div>
</section>

          </div>

          <div className="settings-footer-spacer" />

        </div>
      </div>
  );
}