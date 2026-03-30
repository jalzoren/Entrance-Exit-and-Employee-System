import React, { useEffect, useState, useRef } from 'react';
import './ccs/settings.css';
import {
  getDepartments, getPositions, getLocations,
  addDepartment, addPosition, addLocation,
  updateDepartment, deleteDepartment,
  updatePosition, deletePosition,
  updateLocation, deleteLocation,
} from '../api';

const TAB_CONFIG = [
  { key: 'branding',    label: 'Branding',    icon: 'bi-palette-fill' },
  { key: 'departments', label: 'Departments', icon: 'bi-diagram-3-fill' },
  { key: 'positions',   label: 'Positions',   icon: 'bi-person-badge-fill' },
  { key: 'locations',   label: 'Locations',   icon: 'bi-geo-alt-fill' },
];

// ── Key used for localStorage ──────────────────────────────────────────────
const LOGO_KEY = 'institution_logo';
const NAME_KEY = 'institution_name';

export default function Settingspage({ onBrandingChange }) {
  const [activeTab, setActiveTab] = useState('branding');
  const [departments, setDepartments] = useState([]);
  const [positions,   setPositions]   = useState([]);
  const [locations,   setLocations]   = useState([]);

  // Search states per tab
  const [deptSearch, setDeptSearch] = useState('');
  const [posSearch,  setPosSearch]  = useState('');
  const [locSearch,  setLocSearch]  = useState('');

  // ── Branding state ─────────────────────────────────────────────────────
  const [previewUrl,       setPreviewUrl]       = useState(() => localStorage.getItem(LOGO_KEY) || null);
  const [institutionName,  setInstitutionName]  = useState(() => localStorage.getItem(NAME_KEY) || 'College / Institution Name');
  const [pendingFile,      setPendingFile]      = useState(null);   // File object not yet saved
  const [saveSuccess,      setSaveSuccess]      = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [d, p, l] = await Promise.all([getDepartments(), getPositions(), getLocations()]);
        setDepartments(Array.isArray(d) ? d : []);
        setPositions(Array.isArray(p)   ? p : []);
        setLocations(Array.isArray(l)   ? l : []);
      } catch (e) { console.error('Failed to load settings data', e); }
    })();
  }, []);

  // ── Logo file picker ───────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);   // instant preview
    reader.readAsDataURL(file);
  };

  // Click on the preview box opens the file picker
  const handlePreviewClick = () => fileInputRef.current?.click();

  // ── Save branding ──────────────────────────────────────────────────────
  const handleBrandingSave = () => {
    // Persist logo (base64) and name to localStorage
    if (previewUrl) localStorage.setItem(LOGO_KEY, previewUrl);
    localStorage.setItem(NAME_KEY, institutionName);

    // Notify parent (AdminDashboard) so sidebar updates immediately
    if (onBrandingChange) {
      onBrandingChange({ logo: previewUrl, name: institutionName });
    }

    // Flash success state
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // ── CRUD helpers ──
  const handleAdd = async (type) => {
    const labels = { departments: 'department', positions: 'position', locations: 'location' };
    const name = window.prompt(`Enter new ${labels[type]} name:`);
    if (!name?.trim()) return;
    try {
      if (type === 'departments') { await addDepartment({ department_name: name.trim() }); setDepartments(Array.isArray(await getDepartments()) ? await getDepartments() : []); }
      if (type === 'positions')   { await addPosition({ position_name: name.trim() });    setPositions(Array.isArray(await getPositions())   ? await getPositions()   : []); }
      if (type === 'locations')   { await addLocation({ location_name: name.trim() });    setLocations(Array.isArray(await getLocations())   ? await getLocations()   : []); }
    } catch (e) { window.alert(`Failed to add ${labels[type]}.`); }
  };

  const handleEdit = async (type, item) => {
    const fieldMap = { departments: 'department_name', positions: 'position_name', locations: 'location_name' };
    const idMap    = { departments: 'department_ID',   positions: 'position_ID',   locations: 'location_ID'   };
    const field = fieldMap[type], id = idMap[type];
    const name = window.prompt(`Edit name:`, item[field]);
    if (!name?.trim() || name.trim() === item[field]) return;
    try {
      if (type === 'departments') { await updateDepartment(item[id], { [field]: name.trim() }); setDepartments(Array.isArray(await getDepartments()) ? await getDepartments() : []); }
      if (type === 'positions')   { await updatePosition(item[id],   { [field]: name.trim() }); setPositions(Array.isArray(await getPositions())     ? await getPositions()   : []); }
      if (type === 'locations')   { await updateLocation(item[id],   { [field]: name.trim() }); setLocations(Array.isArray(await getLocations())     ? await getLocations()   : []); }
    } catch (e) { window.alert('Failed to update.'); }
  };

  const handleRemove = async (type, item) => {
    const fieldMap = { departments: 'department_name', positions: 'position_name', locations: 'location_name' };
    const idMap    = { departments: 'department_ID',   positions: 'position_ID',   locations: 'location_ID'   };
    if (!window.confirm(`Remove "${item[fieldMap[type]]}"?`)) return;
    try {
      if (type === 'departments') { await deleteDepartment(item[idMap[type]]); setDepartments(Array.isArray(await getDepartments()) ? await getDepartments() : []); }
      if (type === 'positions')   { await deletePosition(item[idMap[type]]);   setPositions(Array.isArray(await getPositions())     ? await getPositions()   : []); }
      if (type === 'locations')   { await deleteLocation(item[idMap[type]]);   setLocations(Array.isArray(await getLocations())     ? await getLocations()   : []); }
    } catch (e) { window.alert('Failed to remove.'); }
  };

  // ── List renderer ──
  const renderList = (type, items, search, setSearch, nameField, iconClass) => {
    const filtered = items.filter(i => i[nameField]?.toLowerCase().includes(search.toLowerCase()));
    return (
      <>
        <div className="list-toolbar">
          <div className="list-search-wrapper">
            <i className={`bi bi-search list-search-icon`}></i>
            <input
              type="text"
              className="list-search-input"
              placeholder={`Search ${type}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="list-count-badge">{filtered.length} {type}</span>
          <button className="btn-settings-primary" onClick={() => handleAdd(type)}>
            <i className="bi bi-plus-lg"></i> Add
          </button>
        </div>

        <div className="list-items">
          {filtered.length === 0 ? (
            <div className="list-empty">
              <i className={`bi ${iconClass}`}></i>
              <p>No {type} found</p>
            </div>
          ) : filtered.map((item, i) => (
            <div className="list-item" key={i}>
              <div className="list-item-name">
                <div className="list-item-icon">
                  <i className={`bi ${iconClass}`}></i>
                </div>
                {item[nameField]}
              </div>
              <div className="list-item-actions">
                <button className="btn-settings-edit" onClick={() => handleEdit(type, item)}>
                  <i className="bi bi-pencil"></i> Edit
                </button>
                <button className="btn-settings-remove" onClick={() => handleRemove(type, item)}>
                  <i className="bi bi-trash"></i> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const panelMeta = {
    branding:    { title: 'Branding',     desc: 'Customize your institution logo and name' },
    departments: { title: 'Departments',  desc: 'Manage department records used across the system' },
    positions:   { title: 'Positions',    desc: 'Manage employee position types' },
    locations:   { title: 'Locations',    desc: 'Manage event and entry/exit locations' },
  };

  return (
    <div className="settings-page">

      {/* Page header */}
      <div className="settings-page-header">
        <h1 className="settings-page-title">Settings</h1>
        <p className="settings-page-subtitle">Manage your system configuration and preferences</p>
      </div>

      <div className="settings-layout">

        {/* ── Sidebar ── */}
        <aside className="settings-sidebar">
          <span className="settings-sidebar-label">Configuration</span>
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.key}
              className={`settings-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </aside>

        {/* ── Panel ── */}
        <div className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h2 className="settings-panel-title">{panelMeta[activeTab].title}</h2>
              <p className="settings-panel-desc">{panelMeta[activeTab].desc}</p>
            </div>
          </div>

          <div className="settings-panel-body">

            {/* BRANDING */}
            {activeTab === 'branding' && (
              <div className="branding-grid">

                {/* ── Logo preview box ── */}
                <div className="logo-upload-box">
                  <div
                    className="logo-preview-circle"
                    onClick={handlePreviewClick}
                    title="Click to choose a logo"
                    style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                  >
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="Logo preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 'inherit',
                            display: 'block',
                          }}
                        />
                        {/* Hover overlay */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(0,0,0,0.45)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          opacity: 0, transition: 'opacity .2s',
                          borderRadius: 'inherit',
                        }}
                          className="logo-hover-overlay"
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <i className="bi bi-camera" style={{ fontSize: 22, color: '#fff' }}></i>
                          <span style={{ fontSize: 12, color: '#fff', marginTop: 4 }}>Change</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-building"></i>
                        <span>Click to<br />upload logo</span>
                      </>
                    )}
                  </div>
                  <p className="logo-upload-hint">PNG or JPG<br />Max 2MB</p>
                </div>

                <div className="branding-fields">
                  {/* ── File input (hidden, triggered by preview box or button) ── */}
                  <div className="settings-field-group">
                    <label className="settings-field-label">Upload Logo</label>
                    <div className="settings-file-input-wrapper">
                      <label className="settings-file-label" style={{ cursor: 'pointer' }}>
                        <i className="bi bi-cloud-upload"></i>
                        {pendingFile ? pendingFile.name : 'Choose file to upload'}
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden-file-input"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <p className="settings-field-hint">Supported formats: PNG, JPG, SVG</p>
                  </div>

                  {/* ── Institution name ── */}
                  <div className="settings-field-group">
                    <label className="settings-field-label">Institution Name</label>
                    <div className="settings-input-row">
                      <input
                        type="text"
                        className="settings-text-input"
                        value={institutionName}
                        onChange={e => setInstitutionName(e.target.value)}
                      />
                      <button
                        className="btn-settings-primary"
                        onClick={handleBrandingSave}
                        style={saveSuccess ? { background: '#155724', borderColor: '#155724' } : {}}
                      >
                        {saveSuccess
                          ? <><i className="bi bi-check2-all"></i> Saved!</>
                          : <><i className="bi bi-check-lg"></i> Save</>
                        }
                      </button>
                    </div>
                    <p className="settings-field-hint">This name appears in the sidebar and reports</p>
                  </div>
                </div>
              </div>
            )}

            {/* DEPARTMENTS */}
            {activeTab === 'departments' && renderList(
              'departments', departments, deptSearch, setDeptSearch,
              'department_name', 'bi-diagram-3'
            )}

            {/* POSITIONS */}
            {activeTab === 'positions' && renderList(
              'positions', positions, posSearch, setPosSearch,
              'position_name', 'bi-person-badge'
            )}

            {/* LOCATIONS */}
            {activeTab === 'locations' && renderList(
              'locations', locations, locSearch, setLocSearch,
              'location_name', 'bi-geo-alt'
            )}

          </div>
        </div>

      </div>
    </div>
  );
}