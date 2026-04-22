// AcademicYearSettings.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

function AcademicYearSettings() {
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

  // ── Load ───────────────────────────────────────────────────────────────────
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
        console.error('Failed to load academic year settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Auto-increment school year when year_end changes ──────────────────────
  const handleYearStartChange = (e) => {
    const start = e.target.value;
    const end   = String(parseInt(start) + 1);
    setForm(p => ({ ...p, school_year_start: start, school_year_end: end }));
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (form.sem1_end <= form.sem1_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid 1st Semester',
        text: 'Semester 1 end must be after start.', confirmButtonText: 'OK' });
      return;
    }
    if (form.sem2_end <= form.sem2_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid 2nd Semester',
        text: 'Semester 2 end must be after start.', confirmButtonText: 'OK' });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Refresh academic info
      const acadRes = await fetch('/api/settings/academic-year');
      setAcademicInfo(await acadRes.json());

      Swal.fire({ icon: 'success', title: 'Academic Year Saved',
        text: 'Settings updated successfully.', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Save Failed', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Promote students ───────────────────────────────────────────────────────
  const handlePromote = async () => {
    const confirm = await Swal.fire({
      icon:              'warning',
      title:             'Promote Students?',
      html: `
        <p>This will:</p>
        <ul style="text-align:left; margin: 8px 0;">
          <li>Increment year level for all <strong>Regular</strong> students (Year 1–3)</li>
          <li>Mark <strong>4th year Regular</strong> students as <strong>Graduated</strong></li>
          <li>Leave <strong>Irregular, LOA, Dropout</strong> etc. unchanged</li>
        </ul>
        <p><strong>This action cannot be undone.</strong></p>
      `,
      showCancelButton:   true,
      confirmButtonText:  'Yes, Promote',
      cancelButtonText:   'Cancel',
      confirmButtonColor: '#01311d',
    });

    if (!confirm.isConfirmed) return;

    try {
      setPromoting(true);
      const res  = await fetch('/api/settings/promote-students', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire({
        icon:  'success',
        title: 'Promotion Complete',
        html:  `<p><strong>${data.promoted}</strong> students promoted.<br/><strong>${data.graduated}</strong> students graduated.</p>`,
        confirmButtonText: 'Done',
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Promotion Failed', text: err.message });
    } finally {
      setPromoting(false);
    }
  };

  if (loading) return <div className="loading-state">Loading academic year settings...</div>;

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Academic Year Settings</h2>
      <p className="settings-desc">
        Set the current school year and semester dates. The system auto-detects
        the current semester based on today's date.
      </p>

      {/* ── Current Status Banner ─────────────────────────────────────────── */}
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

      {/* ── School Year ───────────────────────────────────────────────────── */}
      <div className="settings-group">
        <h3 className="settings-group-title">School Year</h3>
        <div className="settings-row">
          <div className="settings-field">
            <label>Start Year</label>
            <input type="number" min="2020" max="2099"
              value={form.school_year_start}
              onChange={handleYearStartChange}
            />
            <span className="field-hint">e.g. 2025 for SY 2025-2026</span>
          </div>
          <div className="settings-field">
            <label>End Year</label>
            <input type="number" value={form.school_year_end} disabled
              style={{ opacity: 0.6, background: '#f5f5f5' }} />
            <span className="field-hint">Auto-calculated from start year</span>
          </div>
        </div>
      </div>

      {/* ── 1st Semester ──────────────────────────────────────────────────── */}
      <div className="settings-group">
        <h3 className="settings-group-title">
          1st Semester
          {academicInfo?.detectedSemester === '1' && (
            <span className="semester-active-badge">● Active</span>
          )}
        </h3>
        <div className="settings-row">
          <div className="settings-field">
            <label>Start Date</label>
            <input type="date" value={form.sem1_start}
              onChange={e => setForm(p => ({ ...p, sem1_start: e.target.value }))} />
          </div>
          <div className="settings-field">
            <label>End Date</label>
            <input type="date" value={form.sem1_end}
              onChange={e => setForm(p => ({ ...p, sem1_end: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* ── 2nd Semester ──────────────────────────────────────────────────── */}
      <div className="settings-group">
        <h3 className="settings-group-title">
          2nd Semester
          {academicInfo?.detectedSemester === '2' && (
            <span className="semester-active-badge">● Active</span>
          )}
        </h3>
        <div className="settings-row">
          <div className="settings-field">
            <label>Start Date</label>
            <input type="date" value={form.sem2_start}
              onChange={e => setForm(p => ({ ...p, sem2_start: e.target.value }))} />
          </div>
          <div className="settings-field">
            <label>End Date</label>
            <input type="date" value={form.sem2_end}
              onChange={e => setForm(p => ({ ...p, sem2_end: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Academic Year Settings'}
        </button>

        {/* Promotion button — only show when promotion is due or manually */}
        <div className="promotion-section">
          <h3 className="settings-group-title">Year Level Promotion</h3>
          <p className="settings-desc">
            Run this at the end of the school year. Regular students advance one year level.
            4th year Regular students are automatically marked as Graduated.
            Irregular, LOA, Dropout, and other statuses are <strong>not affected</strong>.
          </p>
          {academicInfo?.promotionDue && (
            <div className="promotion-due-alert">
              ⚠️ The 2nd semester has ended. Student promotion is recommended.
            </div>
          )}
          <button
            className="settings-promote-btn"
            onClick={handlePromote}
            disabled={promoting}
          >
            {promoting ? 'Promoting...' : '🎓 Promote Regular Students'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AcademicYearSettings;