// ManualInputModal.jsx
import { useState } from "react";
import '../componentscss/ManualInputModal.css';
import { showEntryExitAlert } from '../components/ShowEntryExitAlerts.jsx';

function ManualInputModal({ onClose, mode = 'ENTRY' }) {
  const [studentId, setStudentId] = useState('');
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(false);

  // Format student ID input as "YY-XXXXX" ----------------------
  const handleStudentIdChange = (e) => {
    // Strip everything except digits
    const digits = e.target.value.replace(/\D/g, "");

    let formatted = digits;

    // Auto-insert dash after the first 2 digits
    if (digits.length >= 2) {
      const year   = digits.slice(0, 2);
      const number = digits.slice(2, 7); // max 5 digits after the dash
      formatted = number.length > 0 ? `${year}-${number}` : year;
    }

    setStudentId(formatted);
  };
  
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
        body: JSON.stringify({
          student_id: studentId.trim(),
          mode,       
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Entry failed.');

      setStatus({ type: 'success', message: data.message });
      setStudentId('');
      onClose();
      showEntryExitAlert({
        action:     data.action,
        student:    data.student,
        department: data.department,
      });

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
            maxLength={8}
            placeholder="e.g. 23-00123"
            value={studentId}
            onChange={handleStudentIdChange}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
            autoFocus
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