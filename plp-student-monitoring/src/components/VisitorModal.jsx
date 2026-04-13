// VisitorModal.jsx
import { useState, useEffect } from "react";
import { parseVisitorConfig } from '../utils/xmlParser';
import '../componentscss/VisitorModal.css';
import '../css/GlobalModal.css';

function VisitorModal({ onClose }) {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch XML from public folder
    fetch('/visitor-config.xml')
      .then(response => response.text())
      .then(xmlString => {
        const parsedConfig = parseVisitorConfig(xmlString);
        setConfig(parsedConfig);
        
        // Initialize form
        const initialForm = {};
        parsedConfig.fields.forEach(field => {
          initialForm[field.name] = '';
        });
        setForm(initialForm);
      })
      .catch(error => {
        console.error('Failed to load config:', error);
        setStatus({ type: 'error', message: 'Failed to load form configuration' });
      });
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const isFieldVisible = (field) => {
    if (field.dependsOn) {
      return form[field.dependsOn] === field.dependsValue;
    }
    return true;
  };

  const validateForm = () => {
    for (const field of config.fields) {
      if (field.required && isFieldVisible(field)) {
        const value = form[field.name];
        if (!value || !value.trim()) {
          setStatus({ type: 'error', message: field.errorMessage });
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setStatus(null);

    try {
      const apiBody = {};
      Object.keys(config.apiConfig.fieldMapping).forEach(formField => {
        const apiField = config.apiConfig.fieldMapping[formField];
        let value = form[formField];
        
        if (formField === 'otherReason' && form.reason !== 'Other') {
          value = '';
        }
        
        apiBody[apiField] = value;
      });

      const res = await fetch(config.apiConfig.url, {
        method: config.apiConfig.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed.');

      setStatus({ type: 'success', message: data.message || 'Visitor pass registered.' });
      
      const resetForm = {};
      config.fields.forEach(field => {
        resetForm[field.name] = '';
      });
      setForm(resetForm);
      
      // Optional: Close modal after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-box">Loading form configuration...</div>
      </div>
    );
  }

  const renderField = (field) => {
    if (!isFieldVisible(field)) return null;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name}>
            <label className="modal-label">{field.label}</label>
            <textarea
              className="modal-input modal-textarea"
              placeholder={field.placeholder}
              value={form[field.name] || ''}
              onChange={e => update(field.name, e.target.value)}
              disabled={loading}
            />
          </div>
        );
      
      case 'select':
        return (
          <div key={field.name}>
            <label className="modal-label">{field.label}</label>
            <select
              className="modal-input modal-select"
              value={form[field.name] || ''}
              onChange={e => update(field.name, e.target.value)}
              disabled={loading}
            >
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      
      default:
        return (
          <div key={field.name}>
            <label className="modal-label">{field.label}</label>
            <input
              className="modal-input"
              type={field.type}
              placeholder={field.placeholder}
              value={form[field.name] || ''}
              onChange={e => update(field.name, e.target.value)}
              disabled={loading}
              required={field.required}
            />
          </div>
        );
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <span>{config.modalConfig.title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-instructions-title">{config.modalConfig.instructions.title}</p>
          <p className="modal-instructions-text">{config.modalConfig.instructions.text}</p>

          {config.fields.map(field => renderField(field))}

          <p className="modal-hint">{config.modalConfig.hint}</p>

          {status && (
            <p className={`modal-status ${status.type}`}>{status.message}</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="modal-btn submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default VisitorModal;