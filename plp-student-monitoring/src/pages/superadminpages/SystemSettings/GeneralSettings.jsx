// GeneralSettings.jsx
// Combines Gate Settings + Academic Year Settings under one tab.
import React, { useState, useEffect } from 'react';
import "../../../css/GeneralSettings.css";
import Swal from 'sweetalert2';

// ─────────────────────────────────────────────────────────────────────────────
// GATE SETTINGS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function GateSettingsSection() {
  const [form, setForm] = useState({
    gate_entry_start:     '06:00',
    gate_entry_end:       '21:00',
    gate_exit_start:      '06:00',
    gate_exit_end:        '23:00',
    block_outside_window: 'true',
  });
  const [gateStatus, setGateStatus] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [settRes, statusRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/settings/gate-status'),
        ]);
        const settings = await settRes.json();
        const status   = await statusRes.json();

        setForm({
          gate_entry_start:     settings.gate_entry_start    || '06:00',
          gate_entry_end:       settings.gate_entry_end      || '21:00',
          gate_exit_start:      settings.gate_exit_start     || '06:00',
          gate_exit_end:        settings.gate_exit_end       || '23:00',
          block_outside_window: settings.block_outside_window || 'true',
        });
        setGateStatus(status);
      } catch (err) {
        console.error('[GateSettings] load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Refresh live gate status every 60 s
    const interval = setInterval(() => {
      fetch('/api/settings/gate-status')
        .then(r => r.json())
        .then(setGateStatus)
        .catch(console.error);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (form.gate_entry_end <= form.gate_entry_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid Entry Window',
        text: 'Entry end time must be after start time.', confirmButtonText: 'OK' });
      return;
    }
    if (form.gate_exit_end <= form.gate_exit_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid Exit Window',
        text: 'Exit end time must be after start time.', confirmButtonText: 'OK' });
      return;
    }

    try {
      setSaving(true);
      const res  = await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const statusRes = await fetch('/api/settings/gate-status');
      setGateStatus(await statusRes.json());

      Swal.fire({ icon: 'success', title: 'Gate Settings Saved',
        timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Save Failed', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-state">Loading gate settings…</div>;

  return (
    <div className="settings-section">
      <h2 className="section-title">GATE SETTINGS</h2>
      <p className="setting-description" style={{ marginBottom: 16 }}>
        Define the allowed time windows for student entry and exit. Outside these
        windows the system can block or warn attempted scans.
      </p>

      {/* ── Live status bar ────────────────────────────────────────────── */}
      {gateStatus && (
        <div className="gate-status-bar">
          <div className={`gate-status-item ${gateStatus.entryOpen ? 'open' : 'closed'}`}>
            <span className="gate-dot" />
            <span>Entry Gate: <strong>{gateStatus.entryOpen ? 'OPEN' : 'CLOSED'}</strong></span>
            <span className="gate-window">({gateStatus.entryWindow})</span>
          </div>
          <div className={`gate-status-item ${gateStatus.exitOpen ? 'open' : 'closed'}`}>
            <span className="gate-dot" />
            <span>Exit Gate: <strong>{gateStatus.exitOpen ? 'OPEN' : 'CLOSED'}</strong></span>
            <span className="gate-window">({gateStatus.exitWindow})</span>
          </div>
          <div className="gate-current-time">
            Current time: <strong>{gateStatus.currentTime}</strong>
          </div>
        </div>
      )}

      {/* ── Entry window ───────────────────────────────────────────────── */}
      <div className="setting-item">
        <div className="setting-info">
          <label className="setting-label">CAMPUS ENTRY WINDOW</label>
          <span className="setting-description">Allowed time range for student entry</span>
        </div>
        <div className="setting-control">
          <div className="time-range">
            <input type="time" className="time-input"
              value={form.gate_entry_start}
              onChange={e => setForm(p => ({ ...p, gate_entry_start: e.target.value }))} />
            <span className="time-separator">to</span>
            <input type="time" className="time-input"
              value={form.gate_entry_end}
              onChange={e => setForm(p => ({ ...p, gate_entry_end: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* ── Exit window ────────────────────────────────────────────────── */}
      <div className="setting-item">
        <div className="setting-info">
          <label className="setting-label">CAMPUS EXIT WINDOW</label>
          <span className="setting-description">Allowed time range for student exit</span>
        </div>
        <div className="setting-control">
          <div className="time-range">
            <input type="time" className="time-input"
              value={form.gate_exit_start}
              onChange={e => setForm(p => ({ ...p, gate_exit_start: e.target.value }))} />
            <span className="time-separator">to</span>
            <input type="time" className="time-input"
              value={form.gate_exit_end}
              onChange={e => setForm(p => ({ ...p, gate_exit_end: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* ── Block toggle ───────────────────────────────────────────────── */}
      <div className="setting-item checkbox-item">
        <div className="setting-info">
          <label className="setting-label">Block Scans Outside Window</label>
          <span className="setting-description">
            When enabled, scans attempted outside the windows are rejected.
            When disabled, they are allowed but flagged.
          </span>
        </div>
        <div className="setting-control">
          <label className="switch">
            <input type="checkbox"
              checked={form.block_outside_window === 'true'}
              onChange={e => setForm(p => ({
                ...p, block_outside_window: e.target.checked ? 'true' : 'false'
              }))} />
            <span className="slider round" />
          </label>
        </div>
      </div>

      <div className="save-settings">
        <button className="save-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'SAVE GATE SETTINGS'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC YEAR SETTINGS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function AcademicYearSection() {
  const [form, setForm] = useState({
    school_year_start: '2025',
    school_year_end:   '2026',
    semester:          '1',
    sem1_start:        '2025-08-01',
    sem1_end:          '2025-12-31',
    sem2_start:        '2026-01-01',
    sem2_end:          '2026-05-31',
  });
  const [academicInfo, setAcademicInfo] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [promoting,    setPromoting]    = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [settRes, acadRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/settings/academic-year'),
        ]);
        const settings = await settRes.json();
        const acad     = await acadRes.json();

        setForm({
          school_year_start: settings.school_year_start || '2025',
          school_year_end:   settings.school_year_end   || '2026',
          semester:          settings.semester           || '1',
          sem1_start:        settings.sem1_start         || '2025-08-01',
          sem1_end:          settings.sem1_end           || '2025-12-31',
          sem2_start:        settings.sem2_start         || '2026-01-01',
          sem2_end:          settings.sem2_end           || '2026-05-31',
        });
        setAcademicInfo(acad);
      } catch (err) {
        console.error('[AcademicYear] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-derive end year from start year
  const handleYearStartChange = (e) => {
    const start = e.target.value;
    setForm(p => ({ ...p, school_year_start: start, school_year_end: String(parseInt(start) + 1) }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (form.sem1_end <= form.sem1_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid 1st Semester',
        text: 'End date must be after start date.', confirmButtonText: 'OK' });
      return;
    }
    if (form.sem2_end <= form.sem2_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid 2nd Semester',
        text: 'End date must be after start date.', confirmButtonText: 'OK' });
      return;
    }

    try {
      setSaving(true);
      const res  = await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const acadRes = await fetch('/api/settings/academic-year');
      setAcademicInfo(await acadRes.json());

      Swal.fire({ icon: 'success', title: 'Academic Year Saved',
        timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Save Failed', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Promote ───────────────────────────────────────────────────────────────
  const handlePromote = async () => {
    const result = await Swal.fire({
      icon:             'warning',
      title:            'Promote Students?',
      html: `
        <p>This will:</p>
        <ul style="text-align:left;margin:8px 0;">
          <li>Increment year level for all <strong>Regular</strong> students (Year 1–3)</li>
          <li>Mark <strong>4th-year Regular</strong> students as <strong>Graduated</strong></li>
          <li>Leave Irregular, LOA, Dropout, etc. <strong>unchanged</strong></li>
        </ul>
        <p><strong>This action cannot be undone.</strong></p>
      `,
      showCancelButton:  true,
      confirmButtonText: 'Yes, Promote',
      cancelButtonText:  'Cancel',
      confirmButtonColor:'#01311d',
    });
    if (!result.isConfirmed) return;

    try {
      setPromoting(true);
      const res  = await fetch('/api/settings/promote-students', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire({
        icon:  'success',
        title: 'Promotion Complete',
        html:  `<p><strong>${data.promoted}</strong> students promoted.<br/>
                <strong>${data.graduated}</strong> students graduated.</p>`,
        confirmButtonText: 'Done',
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Promotion Failed', text: err.message });
    } finally {
      setPromoting(false);
    }
  };

  if (loading) return <div className="loading-state">Loading academic year settings…</div>;

  return (
    <div className="settings-section">
      <h2 className="section-title">ACADEMIC YEAR SETTINGS</h2>
      <p className="setting-description" style={{ marginBottom: 16 }}>
        Set the current school year and semester dates. The system auto-detects
        the active semester from today's date.
      </p>

      {/* ── Status banner ──────────────────────────────────────────────── */}
      {academicInfo && (
        <div className="academic-status-banner">
          <div className="academic-status-item">
            <span className="academic-label">School Year</span>
            <span className="academic-value">{academicInfo.schoolYear}</span>
          </div>
          <div className="academic-status-divider" />
          <div className="academic-status-item">
            <span className="academic-label">Active Semester</span>
            <span className="academic-value">
              {academicInfo.detectedSemester === 'Break'
                ? 'Semester Break'
                : `${academicInfo.detectedSemester === '1' ? '1st' : '2nd'} Semester`}
            </span>
          </div>
          <div className="academic-status-divider" />
          <div className="academic-status-item">
            <span className="academic-label">Today</span>
            <span className="academic-value">{academicInfo.today}</span>
          </div>
          {academicInfo.promotionDue && (
            <div className="promotion-warning">
              ⚠️ School year has ended — student promotion is due.
            </div>
          )}
        </div>
      )}

      {/* ── School year ────────────────────────────────────────────────── */}
      <div className="setting-item">
        <div className="setting-info">
          <label className="setting-label">School Year</label>
          <span className="setting-description">Academic year range (e.g. 2025–2026)</span>
        </div>
        <div className="setting-control">
          <div className="time-range">
            <input
              type="number" min="2020" max="2099"
              className="time-input"
              style={{ width: 90 }}
              value={form.school_year_start}
              onChange={handleYearStartChange}
            />
            <span className="time-separator">–</span>
            <input
              type="number" className="time-input"
              style={{ width: 90, opacity: 0.6, background: '#f5f5f5' }}
              value={form.school_year_end}
              disabled
            />
          </div>
        </div>
      </div>

      {/* ── 1st semester ───────────────────────────────────────────────── */}
      <div className="setting-item">
        <div className="setting-info">
          <label className="setting-label">
            1st Semester
            {academicInfo?.detectedSemester === '1' && (
              <span className="semester-active-badge"> ● Active</span>
            )}
          </label>
          <span className="setting-description">Start and end dates for the 1st semester</span>
        </div>
        <div className="setting-control">
          <div className="time-range">
            <input type="date" className="time-input"
              value={form.sem1_start}
              onChange={e => setForm(p => ({ ...p, sem1_start: e.target.value }))} />
            <span className="time-separator">to</span>
            <input type="date" className="time-input"
              value={form.sem1_end}
              onChange={e => setForm(p => ({ ...p, sem1_end: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* ── 2nd semester ───────────────────────────────────────────────── */}
      <div className="setting-item">
        <div className="setting-info">
          <label className="setting-label">
            2nd Semester
            {academicInfo?.detectedSemester === '2' && (
              <span className="semester-active-badge"> ● Active</span>
            )}
          </label>
          <span className="setting-description">Start and end dates for the 2nd semester</span>
        </div>
        <div className="setting-control">
          <div className="time-range">
            <input type="date" className="time-input"
              value={form.sem2_start}
              onChange={e => setForm(p => ({ ...p, sem2_start: e.target.value }))} />
            <span className="time-separator">to</span>
            <input type="date" className="time-input"
              value={form.sem2_end}
              onChange={e => setForm(p => ({ ...p, sem2_end: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="save-settings">
        <button className="save-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'SAVE ACADEMIC YEAR SETTINGS'}
        </button>
      </div>

      {/* ── Year-level promotion ────────────────────────────────────────── */}
      <div className="settings-section" style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e9ecef' }}>
        <h2 className="section-title">YEAR LEVEL PROMOTION</h2>
        <p className="setting-description" style={{ marginBottom: 12 }}>
          Run at the end of the school year. Regular students advance one year level;
          4th-year Regular students are automatically marked as <strong>Graduated</strong>.
          Irregular, LOA, Dropout, and other statuses are <strong>not affected</strong>.
        </p>

        {academicInfo?.promotionDue && (
          <div className="promotion-due-alert">
            ⚠️ The 2nd semester has ended. Student promotion is recommended.
          </div>
        )}

        <div className="save-settings">
          <button
            className="save-button"
            style={{ background: 'linear-gradient(135deg, #1565c0, #0d47a1)' }}
            onClick={handlePromote}
            disabled={promoting}
          >
            {promoting ? 'Promoting…' : '🎓 Promote Regular Students'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function GeneralSettings() {
  return (
    <>
      <GateSettingsSection />
      <AcademicYearSection />
    </>
  );
}

export default GeneralSettings;