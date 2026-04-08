import React, { useEffect, useState, useRef } from 'react';
import './ccs/settings.css';
//Settingspage.js

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

const PLP_LOGO_KEY   = 'plp_logo';
const DEPT_LOGOS_KEY = 'dept_logos';
const NAME_KEY       = 'institution_name';

// ── Reusable Modal Component ─────────────────────────────────────────────────
function SettingsModal({ modal, onConfirm, onCancel }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (modal?.type === 'input' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [modal]);

  if (!modal) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && modal.type === 'input') onConfirm(inputRef.current?.value);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="settings-modal-overlay" onClick={onCancel}>
      <div className="settings-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={`settings-modal-icon ${modal.variant || 'primary'}`}>
          <i className={`bi ${modal.icon || 'bi-question-circle'}`}></i>
        </div>
        <h3 className="settings-modal-title">{modal.title}</h3>
        {modal.message && <p className="settings-modal-message">{modal.message}</p>}
        {modal.type === 'input' && (
          <input
            ref={inputRef}
            type="text"
            className="settings-modal-input"
            defaultValue={modal.defaultValue || ''}
            placeholder={modal.placeholder || 'Enter name...'}
          />
        )}
        <div className="settings-modal-actions">
          <button className="settings-modal-btn-cancel" onClick={onCancel}>Cancel</button>
          <button
            className={`settings-modal-btn-confirm ${modal.variant || 'primary'}`}
            onClick={() => onConfirm(modal.type === 'input' ? inputRef.current?.value : true)}
          >
            <i className={`bi ${modal.confirmIcon || 'bi-check-lg'}`}></i>
            {modal.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Logo Upload Box ───────────────────────────────────────────────────────────
function LogoUploadBox({ label, hint, previewUrl, onFileChange, onClear }) {
  const fileRef = useRef(null);

  return (
    <div className="logo-upload-box">
      <div
        className="logo-preview-circle"
        onClick={() => fileRef.current?.click()}
        title="Click to choose a logo"
        style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Logo preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, display: 'block' }}
            />
            <div
              className="logo-hover-overlay"
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity .2s',
              }}
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

      <p className="logo-upload-hint" style={{ textAlign: 'center', fontWeight: 600, color: '#374151', marginBottom: 2 }}>{label}</p>
      <p className="logo-upload-hint">{hint || 'PNG or JPG · Max 2MB'}</p>

      <input
        ref={fileRef}
        type="file"
        className="hidden-file-input"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => onFileChange(ev.target.result);
          reader.readAsDataURL(file);
        }}
      />

      {previewUrl && onClear && (
        <button
          onClick={onClear}
          style={{
            marginTop: 4, background: 'none', border: '1px solid #fecaca',
            borderRadius: 8, padding: '3px 10px', fontSize: 12, color: '#dc2626', cursor: 'pointer',
          }}
        >
          <i className="bi bi-x-lg me-1"></i>Remove
        </button>
      )}
    </div>
  );
}

// ── DepartmentLogos sub-panel ─────────────────────────────────────────────────
function DepartmentLogosPanel({ departments }) {
  const [deptLogos, setDeptLogos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DEPT_LOGOS_KEY) || '{}'); }
    catch { return {}; }
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleLogoChange = (deptName, dataUrl) => {
    setDeptLogos(prev => ({ ...prev, [deptName]: dataUrl }));
  };

  const handleRemoveLogo = (deptName) => {
    setDeptLogos(prev => {
      const next = { ...prev };
      delete next[deptName];
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem(DEPT_LOGOS_KEY, JSON.stringify(deptLogos));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!departments || departments.length === 0) {
    return (
      <div className="list-empty">
        <i className="bi bi-diagram-3" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.5 }}></i>
        <p>No departments found. Add departments first.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Each department can have its own college logo. This logo appears on the right side of attendance exports when that department is selected.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20, marginBottom: 24 }}>
        {departments.map((dept, i) => {
          const name = dept.department_name;
          return (
            <div
              key={i}
              style={{
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 12, padding: '16px 12px', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
            >
              <LogoUploadBox
                label={name}
                hint="College logo"
                previewUrl={deptLogos[name] || null}
                onFileChange={url => handleLogoChange(name, url)}
                onClear={() => handleRemoveLogo(name)}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-settings-primary"
          onClick={handleSave}
          style={saveSuccess ? { background: '#155724' } : {}}
        >
          {saveSuccess
            ? <><i className="bi bi-check2-all"></i> Saved!</>
            : <><i className="bi bi-check-lg"></i> Save Department Logos</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Settingspage({ onBrandingChange }) {
  const [activeTab, setActiveTab] = useState('branding');
  const [departments, setDepartments] = useState([]);
  const [positions,   setPositions]   = useState([]);
  const [locations,   setLocations]   = useState([]);

  const [deptSearch, setDeptSearch] = useState('');
  const [posSearch,  setPosSearch]  = useState('');
  const [locSearch,  setLocSearch]  = useState('');

  const [plpLogo,         setPlpLogo]         = useState(() => localStorage.getItem(PLP_LOGO_KEY) || null);
  const [institutionName, setInstitutionName] = useState(() => localStorage.getItem(NAME_KEY) || 'College / Institution Name');
  const [saveSuccess,     setSaveSuccess]     = useState(false);

  const [modal,        setModal]        = useState(null);
  const [modalResolve, setModalResolve] = useState(null);

  const openModal = (config) => new Promise(resolve => {
    setModal(config);
    setModalResolve({ fn: resolve });
  });

  const handleModalConfirm = (value) => {
    setModal(null);
    modalResolve?.fn(value !== undefined ? value : true);
  };

  const handleModalCancel = () => {
    setModal(null);
    modalResolve?.fn(null);
  };

  const refreshDepartments = async () => { const d = await getDepartments(); setDepartments(Array.isArray(d) ? d : []); };
  const refreshPositions   = async () => { const p = await getPositions();   setPositions(Array.isArray(p)   ? p : []); };
  const refreshLocations   = async () => { const l = await getLocations();   setLocations(Array.isArray(l)   ? l : []); };

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

  const handleBrandingSave = async () => {
    const result = await openModal({
      type: 'confirm',
      variant: 'primary',
      icon: 'bi-check-circle',
      title: 'Save Branding',
      message: 'Save the branding changes? This will update the PLP logo and institution name across the system.',
      confirmLabel: 'Save Changes',
      confirmIcon: 'bi-check-lg',
    });
    if (!result) return;
    if (plpLogo) localStorage.setItem(PLP_LOGO_KEY, plpLogo);
    localStorage.setItem(NAME_KEY, institutionName);
    if (onBrandingChange) onBrandingChange({ logo: plpLogo, name: institutionName });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const typeLabels = { departments: 'Department', positions: 'Position', locations: 'Location' };

  const handleAdd = async (type) => {
    const label = typeLabels[type];
    const name = await openModal({
      type: 'input', variant: 'primary', icon: 'bi-plus-circle',
      title: `Add ${label}`,
      message: `Enter the name for the new ${label.toLowerCase()}.`,
      placeholder: `${label} name...`,
      confirmLabel: 'Next', confirmIcon: 'bi-arrow-right',
    });
    if (!name?.trim()) return;
    const confirmed = await openModal({
      type: 'confirm', variant: 'primary', icon: 'bi-plus-circle',
      title: `Confirm Add ${label}`,
      message: `Are you sure you want to add "${name.trim()}" as a new ${label.toLowerCase()}?`,
      confirmLabel: 'Add', confirmIcon: 'bi-plus-lg',
    });
    if (!confirmed) return;
    if (type === 'departments') { await addDepartment({ department_name: name.trim() }); await refreshDepartments(); }
    if (type === 'positions')   { await addPosition(  { position_name:   name.trim() }); await refreshPositions(); }
    if (type === 'locations')   { await addLocation(  { location_name:   name.trim() }); await refreshLocations(); }
  };

  const handleEdit = async (type, item) => {
    const label     = typeLabels[type];
    const nameField = type === 'departments' ? 'department_name' : type === 'positions' ? 'position_name' : 'location_name';
    const newName = await openModal({
      type: 'input', variant: 'primary', icon: 'bi-pencil',
      title: `Edit ${label}`,
      message: `Update the name for this ${label.toLowerCase()}.`,
      defaultValue: item[nameField],
      placeholder: `${label} name...`,
      confirmLabel: 'Save', confirmIcon: 'bi-check-lg',
    });
    if (!newName?.trim() || newName.trim() === item[nameField]) return;
    if (type === 'departments') { await updateDepartment(item.department_ID, { department_name: newName.trim() }); await refreshDepartments(); }
    if (type === 'positions')   { await updatePosition(  item.position_ID,   { position_name:   newName.trim() }); await refreshPositions(); }
    if (type === 'locations')   { await updateLocation(  item.location_ID,   { location_name:   newName.trim() }); await refreshLocations(); }
  };

  const handleRemove = async (type, item) => {
    const label     = typeLabels[type];
    const nameField = type === 'departments' ? 'department_name' : type === 'positions' ? 'position_name' : 'location_name';
    const confirmed = await openModal({
      type: 'confirm', variant: 'danger', icon: 'bi-trash',
      title: `Remove ${label}`,
      message: `Are you sure you want to remove "${item[nameField]}"? This action cannot be undone.`,
      confirmLabel: 'Remove', confirmIcon: 'bi-trash',
    });
    if (!confirmed) return;
    if (type === 'departments') { await deleteDepartment(item.department_ID); await refreshDepartments(); }
    if (type === 'positions')   { await deletePosition(  item.position_ID);   await refreshPositions(); }
    if (type === 'locations')   { await deleteLocation(  item.location_ID);   await refreshLocations(); }
  };

  const renderList = (type, items, search, setSearch, nameField, iconClass) => {
    const filtered = items.filter(i => i[nameField]?.toLowerCase().includes(search.toLowerCase()));
    return (
      <>
        <div className="list-toolbar">
          <div className="list-search-wrapper">
            <i className="bi bi-search list-search-icon"></i>
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
    branding:    { title: 'Branding',    desc: 'Customize your institution logo and name' },
    departments: { title: 'Departments', desc: 'Manage department records used across the system' },
    positions:   { title: 'Positions',   desc: 'Manage employee position types' },
    locations:   { title: 'Locations',   desc: 'Manage event and entry/exit locations' },
  };

  // ── Logo file input ref for Branding tab ──
  const logoFileRef = useRef(null);

  return (
    <div className="settings-page">

      <SettingsModal modal={modal} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />

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

            {/* ── BRANDING TAB ── */}
            {activeTab === 'branding' && (
              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Left: Logo preview circle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div
                    onClick={() => logoFileRef.current?.click()}
                    title="Click to choose a logo"
                    style={{
                      width: 130, height: 130,
                      border: '1.5px dashed #d1d5db',
                      borderRadius: 12,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 8, cursor: 'pointer',
                      overflow: 'hidden', position: 'relative',
                      background: '#f9fafb',
                    }}
                  >
                    {plpLogo ? (
                      <>
                        <img
                          src={plpLogo}
                          alt="Logo preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                        />
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity .2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <i className="bi bi-camera" style={{ fontSize: 22, color: '#fff' }}></i>
                          <span style={{ fontSize: 12, color: '#fff', marginTop: 4 }}>Change</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-building" style={{ fontSize: 28, color: '#9ca3af' }}></i>
                        <span style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.4 }}>
                          Click to<br />upload logo
                        </span>
                      </>
                    )}
                  </div>

                  <span style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
                    PNG or JPG<br />Max 2MB
                  </span>

                  {plpLogo && (
                    <button
                      onClick={() => setPlpLogo(null)}
                      style={{
                        background: 'none', border: '1px solid #fecaca',
                        borderRadius: 8, padding: '3px 10px',
                        fontSize: 12, color: '#dc2626', cursor: 'pointer',
                      }}
                    >
                      <i className="bi bi-x-lg me-1"></i>Remove
                    </button>
                  )}

                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => setPlpLogo(ev.target.result);
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>

                {/* Right: Upload input + Institution Name */}
                <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Upload Logo file picker */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Upload Logo</p>
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        border: '1px solid #d1d5db', borderRadius: 10,
                        padding: '11px 14px', cursor: 'pointer', background: '#fff',
                      }}
                    >
                      <i className="bi bi-cloud-arrow-up" style={{ fontSize: 17, color: '#6b7280' }}></i>
                      <span style={{ fontSize: 14, color: '#6b7280' }}>Choose file to upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => setPlpLogo(ev.target.result);
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Supported formats: PNG, JPG, SVG</p>
                  </div>

                  {/* Institution Name */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Institution Name</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="settings-text-input"
                        value={institutionName}
                        onChange={e => setInstitutionName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-settings-primary"
                        onClick={handleBrandingSave}
                        style={saveSuccess ? { background: '#155724' } : {}}
                      >
                        {saveSuccess
                          ? <><i className="bi bi-check2-all"></i> Saved!</>
                          : <><i className="bi bi-check-lg"></i> Save</>
                        }
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
                      This name appears in the sidebar and reports
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* ── DEPARTMENTS TAB ── */}
            {activeTab === 'departments' && (
              <div>
                {renderList('departments', departments, deptSearch, setDeptSearch, 'department_name', 'bi-diagram-3')}
                <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 28, paddingTop: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Department / College Logos
                  </p>
                  <DepartmentLogosPanel departments={departments} />
                </div>
              </div>
            )}

            {activeTab === 'positions' && renderList('positions', positions, posSearch, setPosSearch, 'position_name', 'bi-person-badge')}
            {activeTab === 'locations' && renderList('locations', locations, locSearch, setLocSearch, 'location_name', 'bi-geo-alt')}

          </div>
        </div>
      </div>
    </div>
  );
}