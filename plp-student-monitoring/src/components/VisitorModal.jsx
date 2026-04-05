// VisitorModal.jsx
import { useState } from "react";
import '../componentscss/VisitorModal.css';
import '../css/GlobalModal.css';


function VisitorModal({ onClose }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    reason: '',
    otherReason: ''
  });
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);

  const REASONS = [
    'Meeting with Faculty',
    'Enrollment / Registration',
    'Library Access',
    'Event / Activity',
    'Delivery / Pickup',
    'Other',
  ];


  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      setStatus({ type: 'error', message: 'Full name is required.' }); return;
    }
    if (!form.email.trim()) {
      setStatus({ type: 'error', message: 'Email is required.' }); return;
    }
    if (!form.reason) {
      setStatus({ type: 'error', message: 'Please select a reason for visit.' }); return;
    }
    if (form.reason === 'Other' && !form.otherReason.trim()) {
      setStatus({ type: 'error', message: 'Please describe your reason.' }); return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('http://localhost:5000/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:    form.fullName.trim(),
          email: form.email.trim(),
          reason:       form.reason,
          other_reason: form.reason === 'Other' ? form.otherReason.trim() : '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed.');

      setStatus({ type: 'success', message: data.message || 'Visitor pass registered.' });
      setForm({ fullName: '', email: '', reason: '', otherReason: '' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <span>Visitor Form</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-instructions-title">INSTRUCTIONS</p>
          <p className="modal-instructions-text">
            Fill in your details to register for a temporary visitor pass.
          </p>

          <label className="modal-label">Full Name</label>
          <input
            className="modal-input"
            type="text"
            placeholder="e.g Bitancor, Jerimiah A."
            value={form.fullName}
            onChange={e => update('fullName', e.target.value)}
            disabled={loading}
            autoFocus
            required
          />

          <label className="modal-label">Email</label>
          <input
            className="modal-input"
            type="email"
            placeholder="e.g. juan@email.com"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            disabled={loading}
            required
          />

          <label className="modal-label">Reason for Visit</label>
          <select
            className="modal-input modal-select"
            value={form.reason}
            onChange={e => update('reason', e.target.value)}
            disabled={loading}
          >
            <option value="">-- Select a reason --</option>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {form.reason === 'Other' && (
            <>
              <label className="modal-label">Other Reason</label>
              <textarea
                className="modal-input modal-textarea"
                placeholder="Describe your reason..."
                value={form.otherReason}
                onChange={e => update('otherReason', e.target.value)}
                disabled={loading}
              />
            </>
          )}

          <p className="modal-hint">
            Check the your email for the QR Code
          </p>

          {status && (
            <p className={`modal-status ${status.type}`}>{status.message}</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="modal-btn submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default VisitorModal;