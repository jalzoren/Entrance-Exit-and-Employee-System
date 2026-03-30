import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Form, Button, Table, Modal, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  updateEmployee,
  getDepartments,
  getPositions,
  getEmailsList,
  getEmployeePhotos,
  saveEmployeePhotos,
} from '../api';
import './ccs/employee.css';

function EmployeesPage() {
  const [employees, setEmployees]                   = useState([]);
  const [departments, setDepartments]               = useState([]);
  const [positions, setPositions]                   = useState([]);
  const [emails, setEmails]                         = useState([]);

  const [searchTerm, setSearchTerm]                 = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');

  const [showModal, setShowModal]                   = useState(false);
  const [isEditing, setIsEditing]                   = useState(false);
  const [editingId, setEditingId]                   = useState(null);

  const [formData, setFormData] = useState({
    employee_code:      '',
    employee_firstName: '',
    employee_LastName:  '',
    department_ID:      '',
    position_ID:        '',
    email_ID:           '',
  });

  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const MAX_SLOTS = 5;
  const [imageSlots, setImageSlots] = useState(Array(MAX_SLOTS).fill(null));

  const [showCamera, setShowCamera] = useState(false);
  const [cameraSlot, setCameraSlot] = useState(null);
  const videoRef                    = useRef(null);
  const streamRef                   = useRef(null);

  useEffect(() => {
    loadEmployees();
    loadMetadata();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await getEmployees({ archived: 0 });
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setEmployees(list.filter(e => e.is_archived !== 1 && e.is_archived !== true));
    } catch (err) {
      showFeedback('danger', 'Failed to load employees');
    }
  };

  const loadMetadata = async () => {
    try {
      const [deps, pos, emls] = await Promise.all([
        getDepartments(),
        getPositions(),
        getEmailsList(),
      ]);
      setDepartments(Array.isArray(deps) ? deps : deps?.data ?? []);
      setPositions(Array.isArray(pos)   ? pos  : pos?.data  ?? []);
      setEmails(Array.isArray(emls)     ? emls : emls?.data ?? []);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.employee_firstName || ''} ${emp.employee_LastName || ''}`.toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchSearch =
      fullName.includes(q) ||
      String(emp.employee_code || '').includes(q) ||
      (emp.position || '').toLowerCase().includes(q);
    const matchDept =
      selectedDepartment === 'All Departments' ||
      emp.department_name === selectedDepartment;
    return matchSearch && matchDept;
  });

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ employee_code: '', employee_firstName: '', employee_LastName: '', department_ID: '', position_ID: '', email_ID: '' });
    setImageSlots(Array(MAX_SLOTS).fill(null));
    setFeedback({ type: '', message: '' });
    setShowModal(true);
  };

  const openEditModal = async (emp) => {
    setIsEditing(true);
    setEditingId(emp.employee_ID);
    setFormData({
      employee_code:      String(emp.employee_code      || ''),
      employee_firstName: String(emp.employee_firstName || ''),
      employee_LastName:  String(emp.employee_LastName  || ''),
      department_ID:      emp.department_ID || '',
      position_ID:        emp.position_ID   || '',
      email_ID:           emp.email_ID      || '',
    });
    setImageSlots(Array(MAX_SLOTS).fill(null));
    setFeedback({ type: '', message: '' });
    setShowModal(true);

    try {
      const photos = await getEmployeePhotos(emp.employee_ID);
      const list   = Array.isArray(photos) ? photos : [];
      const slots  = Array(MAX_SLOTS).fill(null).map((_, i) =>
        list[i] ? { preview: list[i].photo_data, file: null, photo_ID: list[i].photo_ID } : null
      );
      setImageSlots(slots);
    } catch (err) {
      console.error('Could not load employee photos', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSlotFileChange = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSlots(prev => {
        const updated = [...prev];
        updated[index] = { preview: ev.target.result, file };
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSlotRemove = (index) => {
    setImageSlots(prev => {
      const updated = [...prev];
      updated[index] = null;
      return updated;
    });
  };

  const openCamera = async (index) => {
    setCameraSlot(index);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      alert('Camera access denied or not available.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setImageSlots(prev => {
      const updated = [...prev];
      updated[cameraSlot] = { preview: dataUrl, file: null };
      return updated;
    });
    closeCamera();
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraSlot(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!String(formData.employee_code).trim() || !String(formData.employee_firstName).trim() || !String(formData.employee_LastName).trim()) {
      setFeedback({ type: 'danger', message: 'Employee code, first name and last name are required.' });
      return;
    }
    if (!formData.department_ID) { setFeedback({ type: 'danger', message: 'Please select a department.' }); return; }
    if (!formData.position_ID)   { setFeedback({ type: 'danger', message: 'Please select a position.'   }); return; }

    const payload = { ...formData, email_ID: formData.email_ID || null };

    setSaving(true);
    try {
      let result;
      let employeeId = editingId;

      if (isEditing) {
        result = await updateEmployee({ employee_ID: editingId, ...payload });
      } else {
        result     = await addEmployee(payload);
        employeeId = result?.employee_ID || result?.id || result?.insertId;
      }

      const photosToSave = imageSlots.filter(s => s !== null).map(s => s.preview);
      if (employeeId) {
        await saveEmployeePhotos(employeeId, photosToSave);
      }

      setShowModal(false);
      showFeedback('success', result?.message || (isEditing ? 'Employee updated' : 'Employee added'));
      loadEmployees();
    } catch (err) {
      showFeedback('danger', err?.message || 'Operation failed. Check console or backend logs.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this employee?')) return;
    try {
      await deleteEmployee(id);
      showFeedback('success', 'Employee archived');
      loadEmployees();
    } catch (err) {
      showFeedback('danger', 'Failed to archive employee');
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4500);
  };

  return (
    <div className="admin-page">
      <div className="page-header-section">
        <h1 className="page-title">Employee Management</h1>
        <Button variant="success" onClick={openAddModal}>+ Add Employee</Button>
      </div>

      <Card className="content-card">
        <Card.Body>

          {feedback.message && (
            <Alert variant={feedback.type} dismissible onClose={() => setFeedback({ type: '', message: '' })}>
              {feedback.message}
            </Alert>
          )}

          <Row className="mb-4">
            <Col md={7}>
              <Form.Control
                placeholder="Search name, code, position..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={5}>
              <Form.Select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}>
                <option>All Departments</option>
                {departments.map(d => (
                  <option key={d.department_ID} value={d.department_name}>{d.department_name}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Code</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Position</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-4 text-muted">No employees found</td></tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.employee_ID}>
                    <td>{emp.employee_code}</td>
                    <td>{emp.employee_firstName} {emp.employee_LastName}</td>
                    <td>{emp.department_name || '—'}</td>
                    <td>{emp.position || '—'}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEditModal(emp)}>Edit</Button>
                      <Button variant="outline-danger"  size="sm" onClick={() => handleDelete(emp.employee_ID)}>Archive</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

        </Card.Body>
      </Card>

      {/* Employee Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit Employee' : 'Add New Employee'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Employee Code *</Form.Label>
                  <Form.Control name="employee_code" value={formData.employee_code} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control name="employee_firstName" value={formData.employee_firstName} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control name="employee_LastName" value={formData.employee_LastName} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select name="department_ID" value={formData.department_ID} onChange={handleChange} required>
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.department_ID} value={d.department_ID}>{d.department_name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Position *</Form.Label>
                  <Form.Select name="position_ID" value={formData.position_ID} onChange={handleChange} required>
                    <option value="">Select Position</option>
                    {positions.map(p => (
                      <option key={p.position_ID} value={p.position_ID}>{p.position_name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Email <span className="text-muted">(optional)</span></Form.Label>
              <Form.Select name="email_ID" value={formData.email_ID} onChange={handleChange}>
                <option value="">— None —</option>
                {emails.map(e => (
                  <option key={e.email_ID} value={e.email_ID}>{e.email}</option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* 5 Photo Slots */}
            <Form.Group className="mb-4">
              <Form.Label>
                Employee Photos <span className="text-muted">(up to 5 — used for face recognition)</span>
              </Form.Label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {imageSlots.map((slot, i) => (
                  <div key={i} style={{
                    width: 110, height: 110, border: '2px dashed #ccc', borderRadius: 10,
                    position: 'relative', overflow: 'hidden', background: '#f8f9fa',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    {slot ? (
                      <>
                        <img src={slot.preview} alt={`photo-${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => handleSlotRemove(i)} title="Remove" style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'rgba(220,53,69,0.85)', border: 'none', borderRadius: '50%',
                          width: 22, height: 22, color: '#fff', fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', lineHeight: 1,
                        }}>×</button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Photo {i + 1}</div>
                        <label style={{ cursor: 'pointer', marginBottom: 4 }}>
                          <div style={{ background: '#e9f5ec', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#28a745', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                             Upload
                          </div>
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleSlotFileChange(i, e)} />
                        </label>
                        <button type="button" onClick={() => openCamera(i)} style={{
                          background: '#e8f0fe', borderRadius: 6, padding: '4px 8px',
                          fontSize: 11, color: '#1a73e8', fontWeight: 600,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}> Camera</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <Form.Text className="text-muted" style={{ display: 'block', marginTop: 6 }}>
                Click a slot to upload a file or capture via camera.
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" variant={isEditing ? 'warning' : 'success'} disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Employee' : 'Add Employee'}
              </Button>
            </div>

          </Form>
        </Modal.Body>
      </Modal>

      {/* Camera Modal */}
      <Modal show={showCamera} onHide={closeCamera} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title> Capture Photo — Slot {(cameraSlot ?? 0) + 1}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ textAlign: 'center' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 340 }} />
          <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Button variant="secondary" onClick={closeCamera}>Cancel</Button>
            <Button variant="success" onClick={capturePhoto}>📸 Capture</Button>
          </div>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default EmployeesPage;