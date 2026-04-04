// ManualInputModal.jsx
import { useState } from "react";
import '../componentscss/ManualInputModal.css';

function ManualInputModal({ onClose }) {
  const [studentId, setStudentId] = useState('');
  const [status, setStatus]       = useState(null); // { type: 'success'|'error', message }
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (!studentId.trim()) {
      setStatus({ type: 'error', message: 'Please enter your Student ID number.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('http://localhost:5000/api/manualentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim() }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Entry failed.');

      setStatus({ type: 'success', message: data.message || 'Entry recorded successfully.' });
      setStudentId('');
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
          <span>Manual Input</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="modal-label">Student ID Number</label>
          <input
            className="modal-input"
            type="text"
            placeholder="e.g. 23-00123"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
            required
          />
          <p className="modal-hint">Enter your PLP student ID number as it appears on your school ID.</p>

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

export default ManualInputModal;