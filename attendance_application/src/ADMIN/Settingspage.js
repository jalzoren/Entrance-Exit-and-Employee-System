import React, { useState } from 'react';
import './ccs/settings.css';

export default function Settingspage() {

  const [activeTab, setActiveTab] = useState("branding");

  return (
    <div className="settings-page">

      <div className="settings-card-main">

        <h1 className="settings-title">Settings</h1>

        {/* Tabs */}
        <div className="settings-tabs">

          <button
            className={activeTab === "branding" ? "tab active" : "tab"}
            onClick={() => setActiveTab("branding")}
          >
            Branding
          </button>

          <button
            className={activeTab === "departments" ? "tab active" : "tab"}
            onClick={() => setActiveTab("departments")}
          >
            Departments
          </button>

          <button
            className={activeTab === "positions" ? "tab active" : "tab"}
            onClick={() => setActiveTab("positions")}
          >
            Positions
          </button>

          <button
            className={activeTab === "locations" ? "tab active" : "tab"}
            onClick={() => setActiveTab("locations")}
          >
            Locations
          </button>

        </div>


        <div className="settings-content">

        {/* TAB 1 — BRANDING */}

        {activeTab === "branding" && (

          <div className="branding-section">

            <div className="logo-preview">
              <img src="/placeholder-logo.png" alt="logo preview" />
            </div>

            <div className="branding-controls">

              <div className="settings-field">
                <label>Upload Logo</label>
                <input type="file" className="settings-input" />
              </div>

              <div className="settings-field">
                <label>Institution Name</label>

                <div className="inline-row">
                  <input
                    type="text"
                    className="settings-input"
                    defaultValue="College / Institution Name"
                  />

                  <button className="btn-primary">
                    Edit
                  </button>
                </div>

              </div>

            </div>

          </div>

        )}



        {/* TAB 2 — DEPARTMENTS */}

        {activeTab === "departments" && (

          <div>

            <div className="list-toolbar">

              <input
                type="text"
                className="settings-input search"
                placeholder="Search departments..."
              />

              <button className="btn-primary">
                Add
              </button>

            </div>

            <div className="list-items">

              <div className="list-item">
                <span>Department of Computer Science</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

              <div className="list-item">
                <span>Department of Mathematics</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

              <div className="list-item">
                <span>Department of Engineering</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

            </div>

          </div>

        )}



        {/* TAB 3 — POSITIONS */}

        {activeTab === "positions" && (

          <div>

            <div className="list-toolbar">

              <input
                type="text"
                className="settings-input search"
                placeholder="Search positions..."
              />

              <button className="btn-primary">
                Add
              </button>

            </div>

            <div className="list-items">

              <div className="list-item">
                <span>Professor</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

              <div className="list-item">
                <span>Assistant Professor</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

              <div className="list-item">
                <span>Instructor</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

              <div className="list-item">
                <span>Dean</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

            </div>

          </div>

        )}



        {/* TAB 4 — LOCATIONS */}

        {activeTab === "locations" && (

          <div>

            <div className="list-toolbar">

              <input
                type="text"
                className="settings-input search"
                placeholder="Search locations..."
              />

              <button className="btn-primary">
                Add
              </button>

            </div>

            <div className="list-items">

              <div className="list-item">
                <span>Campus Facade</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

              <div className="list-item">
                <span>Auditorium</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

              <div className="list-item">
                <span>Gymnasium</span>

                <div className="actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-remove">Remove</button>
                </div>
              </div>

            </div>

          </div>

        )}

        </div>

      </div>

    </div>
  );
}