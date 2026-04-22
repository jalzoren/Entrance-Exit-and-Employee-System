// GateSettings.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

function GateSettings() {
  const [form, setForm] = useState({
    gate_entry_start:    '06:00',
    gate_entry_end:      '21:00',
    gate_exit_start:     '06:00',
    gate_exit_end:       '23:00',
    block_outside_window: 'true',
  });

  const [gateStatus, setGateStatus] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving,  setSaving]        = useState(false);

  // ── Load current settings ──────────────────────────────────────────────────
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
        console.error('Failed to load gate settings:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
    // Refresh gate status every 60 seconds
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
    // Validate: entry end must be after entry start
    if (form.gate_entry_end <= form.gate_entry_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid Entry Window',
        text: 'Entry end time must be after entry start time.', confirmButtonText: 'OK' });
      return;
    }
    if (form.gate_exit_end <= form.gate_exit_start) {
      Swal.fire({ icon: 'warning', title: 'Invalid Exit Window',
        text: 'Exit end time must be after exit start time.', confirmButtonText: 'OK' });
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

      // Refresh gate status after save
      const statusRes = await fetch('/api/settings/gate-status');
      setGateStatus(await statusRes.json());

      Swal.fire({ icon: 'success', title: 'Gate Settings Saved',
        text: 'Gate windows updated successfully.', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Save Failed', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-state">Loading gate settings...</div>;

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Gate Settings</h2>
      <p className="settings-desc">
        Define the allowed time windows for student entry and exit.
        Outside these windows, the system can block or warn attempted scans.
      </p>

      {/* ── Live Gate Status ─────────────────────────────────────────────── */}
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

      {/* ── Entry Window ─────────────────────────────────────────────────── */}
      <div className="settings-group">
        <h3 className="settings-group-title">Entry Window</h3>
        <div className="settings-row">
          <div className="settings-field">
            <label>Entry Start Time</label>
            <input type="time" value={form.gate_entry_start}
              onChange={e => setForm(p => ({ ...p, gate_entry_start: e.target.value }))} />
            <span className="field-hint">Earliest allowed entry scan</span>
          </div>
          <div className="settings-field">
            <label>Entry End Time</label>
            <input type="time" value={form.gate_entry_end}
              onChange={e => setForm(p => ({ ...p, gate_entry_end: e.target.value }))} />
            <span className="field-hint">Latest allowed entry scan</span>
          </div>
        </div>
      </div>

      {/* ── Exit Window ──────────────────────────────────────────────────── */}
      <div className="settings-group">
        <h3 className="settings-group-title">Exit Window</h3>
        <div className="settings-row">
          <div className="settings-field">
            <label>Exit Start Time</label>
            <input type="time" value={form.gate_exit_start}
              onChange={e => setForm(p => ({ ...p, gate_exit_start: e.target.value }))} />
            <span className="field-hint">Earliest allowed exit scan</span>
          </div>
          <div className="settings-field">
            <label>Exit End Time</label>
            <input type="time" value={form.gate_exit_end}
              onChange={e => setForm(p => ({ ...p, gate_exit_end: e.target.value }))} />
            <span className="field-hint">Latest allowed exit scan. After this, dashboard refreshes automatically.</span>
          </div>
        </div>
      </div>

      {/* ── Block Toggle ─────────────────────────────────────────────────── */}
      <div className="settings-group">
        <h3 className="settings-group-title">Enforcement</h3>
        <label className="toggle-label">
          <input type="checkbox"
            checked={form.block_outside_window === 'true'}
            onChange={e => setForm(p => ({ ...p, block_outside_window: e.target.checked ? 'true' : 'false' }))}
          />
          <span className="toggle-text">
            Block scans outside the gate windows
            <span className="field-hint">
              When off, scans are allowed but flagged as outside window.
            </span>
          </span>
        </label>
      </div>

      <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Gate Settings'}
      </button>
    </div>
  );
}

export default GateSettings;