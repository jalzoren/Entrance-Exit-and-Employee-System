// ManualInputModal.jsx
import { useState } from "react";
import '../componentscss/ManualInputModal.css';
import { showEntryExitAlert } from '../components/ShowEntryExitAlerts.jsx';
import { useLogContext } from '../context/LogContext';

function ManualInputModal({ onClose, mode = 'ENTRY' }) {
  const [studentId, setStudentId] = useState('');
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const { addLog } = useLogContext();

  // Format student ID input as "YY-XXXXX"
  const handleStudentIdChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    let formatted = digits;
    if (digits.length >= 2) {
      const year   = digits.slice(0, 2);
      const number = digits.slice(2, 7);
      formatted = number.length > 0 ? `${year}-${number}` : year;
    }
    setStudentId(formatted);
  };
  
  // Helper function to convert number to year level text
  const getYearLevelText = (yearLevelNumber) => {
    if (!yearLevelNumber && yearLevelNumber !== 0) return "Not Specified";
    const yearMap = {
      1: "1st Year",
      2: "2nd Year",
      3: "3rd Year",
      4: "4th Year",
      5: "5th Year",
      6: "6th Year"
    };
    return yearMap[yearLevelNumber] || `${yearLevelNumber}th Year`;
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
      console.log('API Response:', data);
      console.log('Year level from API (NUMBER):', data.year_level);
      
      if (!res.ok) throw new Error(data.message || 'Entry failed.');

      // Convert number to text for display
      const yearLevelText = getYearLevelText(data.year_level);
      console.log('Converted to text:', yearLevelText);

      // Add log to context with complete student data
      addLog({
        studentId: data.student_id || studentId.trim(),
        name: data.student,
        action: mode,
        method: 'MANUAL',
        collegeDept: data.department || "Not Specified",
        yearLevel: yearLevelText,  // Store as "3rd Year"
        course: data.course || "Not Specified",
        gender: data.gender || "Not Specified"
      });

      setStatus({ type: 'success', message: data.message });
      setStudentId('');
      
      showEntryExitAlert({
        action:     data.action || mode,
        student:    data.student,
        department: data.department,
      });
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Manual entry error:', err);
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