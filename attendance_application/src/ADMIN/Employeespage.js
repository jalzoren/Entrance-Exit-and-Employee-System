import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Form, Button, Table, Modal, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as faceapi from 'face-api.js';
import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  updateEmployee,
  getDepartments,
  getPositions,
  getEmailsList,
  getEmployeePhotos,
  saveEmployeeEmbeddings,
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

  // ── Archive confirmation modal ──
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveTargetId, setArchiveTargetId]       = useState(null);
  const [archiveTargetName, setArchiveTargetName]   = useState('');

  const [formData, setFormData] = useState({
    employee_code:      '',
    employee_firstName: '',
    employee_LastName:  '',
    department_ID:      '',
    position_ID:        '',
    email:              '', // Changed from email_ID to raw email string
  });

  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const MAX_SLOTS = 5;
  const [imageSlots, setImageSlots] = useState(Array(MAX_SLOTS).fill(null));

  const [showCamera, setShowCamera] = useState(false);
  const [cameraSlot, setCameraSlot] = useState(null);
  const videoRef                    = useRef(null);
  const streamRef                   = useRef(null);
  const detectionLoopRef            = useRef(null);   // requestAnimationFrame handle
  const modelsLoadedRef             = useRef(false);  // load models once
  const [showCaptureConfirm, setShowCaptureConfirm] = useState(false);

  // ── Real-time requirement states ──────────────────────────────────────────
  // null = unchecked, true = pass (green), false = fail (red)
  const defaultReqs = {
    faceDetected:   null,
    faceCentered:   null,
    faceInsideCircle: null,
    fullFaceVisible: null,
    neutralExpression: null,
    eyesOpen:       null,
    noHat:          null, // cannot auto-detect — always null (manual)
    noGlasses:      null, // cannot auto-detect — always null (manual)
    goodDistance:   null,
    headUpright:    null,
  };
  const [reqs, setReqs] = useState(defaultReqs);

  // Load face-api models once
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoadedRef.current) return;
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),   // ← ADD THIS LINE
        ]);
        modelsLoadedRef.current = true;
      } catch (err) {
        console.error('Could not load face-api models:', err);
      }
    };
    loadModels();
  }, []);

  // ── Detection loop — runs every animation frame while camera is open ──────
  const runDetectionLoop = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      detectionLoopRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Ellipse guide — matches the SVG overlay (32% of width, 38% of height)
    const cx = vw * 0.5;
    const cy = vh * 0.5;
    const rx = vw * 0.32;
    const ry = vh * 0.38;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detection) {
        setReqs(prev => ({
          ...prev,
          faceDetected:    false,
          faceCentered:    false,
          faceInsideCircle: false,
          fullFaceVisible: false,
          neutralExpression: false,
          eyesOpen:        false,
          goodDistance:    false,
          headUpright:     false,
        }));
      } else {
        const box       = detection.detection.box;
        const landmarks = detection.landmarks;
        const exprs     = detection.expressions;

        // Face center
        const faceCX = box.x + box.width  / 2;
        const faceCY = box.y + box.height / 2;

        // 1. Face detected
        const faceDetected = true;

        // 2. Face centered (face center within 15% of ellipse center)
        const faceCentered =
          Math.abs(faceCX - cx) < vw * 0.10 &&
          Math.abs(faceCY - cy) < vh * 0.10;

        // 3. Face inside circle — all 4 corners of bounding box inside ellipse
        const corners = [
          [box.x,             box.y            ],
          [box.x + box.width, box.y            ],
          [box.x,             box.y + box.height],
          [box.x + box.width, box.y + box.height],
        ];
        const faceInsideCircle = corners.every(([px, py]) =>
          ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1
        );

        // 4. Full face visible (bounding box within video frame)
        const fullFaceVisible =
          box.x > 0 && box.y > 0 &&
          box.x + box.width  < vw &&
          box.y + box.height < vh;

        // 5. Neutral expression (neutral is dominant)
        const neutralExpression = exprs.neutral > 0.5;

        // 6. Eyes open — check eye aspect ratio via landmarks
        const leftEye  = landmarks.getLeftEye();   // 6 points
        const rightEye = landmarks.getRightEye();  // 6 points
        const eyeAR = (eye) => {
          const h1 = Math.abs(eye[1].y - eye[5].y);
          const h2 = Math.abs(eye[2].y - eye[4].y);
          const w  = Math.abs(eye[0].x - eye[3].x);
          return (h1 + h2) / (2 * w);
        };
        const eyesOpen = eyeAR(leftEye) > 0.2 && eyeAR(rightEye) > 0.2;

        // 7. Good distance — face bounding box between 20–60% of frame width
        const faceRatio  = box.width / vw;
        const goodDistance = faceRatio > 0.20 && faceRatio < 0.60;

        // 8. Head upright — eyes should be roughly on the same horizontal line
        const leftPupil  = landmarks.getLeftEye()[0];
        const rightPupil = landmarks.getRightEye()[3];
        const eyeAngle   = Math.abs(Math.atan2(
          rightPupil.y - leftPupil.y,
          rightPupil.x - leftPupil.x
        ) * (180 / Math.PI));
        const headUpright = eyeAngle < 15;

        setReqs({
          faceDetected,
          faceCentered,
          faceInsideCircle,
          fullFaceVisible,
          neutralExpression,
          eyesOpen,
          noHat:     null,  // cannot detect automatically
          noGlasses: null,  // cannot detect automatically
          goodDistance,
          headUpright,
        });
      }
    } catch (err) {
      // silently ignore per-frame errors
    }

    detectionLoopRef.current = requestAnimationFrame(runDetectionLoop);
  };

  // All auto-checkable requirements passed?
  const allAutoReqsMet = reqs.faceDetected && reqs.faceCentered && reqs.faceInsideCircle &&
    reqs.fullFaceVisible && reqs.neutralExpression && reqs.eyesOpen &&
    reqs.goodDistance && reqs.headUpright;

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
    setFormData({ employee_code: '', employee_firstName: '', employee_LastName: '', department_ID: '', position_ID: '', email: '' });
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
      email:              emp.email         || '',
    });
    setImageSlots(Array(MAX_SLOTS).fill(null));
    setFeedback({ type: '', message: '' });
    setShowModal(true);

    try {
      const photos = await getEmployeePhotos(emp.employee_ID);
      const list = Array.isArray(photos) ? photos : [];

      const slots = Array(MAX_SLOTS).fill(null).map((_, i) => {
        if (!list[i]) return null;

        const item = list[i];
        let embedding = null;

        // Try to parse if it's already a JSON embedding
        if (item.photo_data && typeof item.photo_data === 'string') {
          try {
            const parsed = JSON.parse(item.photo_data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              embedding = parsed;
            }
          } catch (e) {
            // It's old base64 image → keep as preview only
          }
        }

        return {
          preview: item.photo_data,     // still show the image if it's base64
          embedding: embedding,         // null for old photos, array for new ones
          photo_ID: item.photo_ID,
          isOldBase64: !embedding
        };
      });

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
  setReqs(defaultReqs);
  setShowCamera(true);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },     // Lower resolution = much less lag
        height: { ideal: 480 },
        facingMode: "user"
      }
    });

    streamRef.current = stream;   // ← Important: save stream for cleanup

    // Assign stream to video and start detection
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          detectionLoopRef.current = requestAnimationFrame(runDetectionLoop);
        };
      }
    }, 100);

  } catch (err) {
    console.error(err);
    alert('Camera access denied or not available.');
    setShowCamera(false);
  }
};

const capturePhoto = async () => {
  if (!videoRef.current) return;

  if (!allAutoReqsMet) {
    setShowCaptureConfirm(true);
    return;
  }

  // If all reqs met, we just do it
  await doCapture();
};

const doCapture = async () => {
  // 1. Immediately hide the confirmation box
  setShowCaptureConfirm(false);
  
  // 2. Wrap the rest in a small timeout to let React hide the box first
  // and ensure we don't block the UI thread during capture
  setTimeout(async () => {
    try {
      if (!videoRef.current) {
        console.warn("videoRef is null, closing camera anyway.");
        closeCamera();
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

      setImageSlots(prev => {
        const updated = [...prev];
        updated[cameraSlot] = { preview: dataUrl, embedding: null, file: null };
        return updated;
      });

      // 3. Close the camera modal IMMEDIATELY after getting the dataUrl
      closeCamera();

      // 4. Then do the heavy face detection stuff in the background
      setTimeout(async () => {
        try {
          const img = await faceapi.fetchImage(dataUrl);
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5, inputSize: 416 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            const embedding = Array.from(detection.descriptor);
            setImageSlots(prev => {
              const updated = [...prev];
              const current = updated[cameraSlot];
              if (current && current.preview === dataUrl) {
                updated[cameraSlot] = { ...current, embedding };
              }
              return updated;
            });
          } else {
            console.warn("No face detected in captured photo");
          }
        } catch (err) {
          console.error("Failed to extract embedding:", err);
        }
      }, 100);

    } catch (err) {
      console.error(err);
      alert("Failed to capture photo.");
      closeCamera(); // Ensure it closes even on error
    }
  }, 10);
};

  const closeCamera = () => {
    // 1. Immediately signal React to hide the modal
    setShowCamera(false);
    setShowCaptureConfirm(false);
    setCameraSlot(null);
    setReqs(defaultReqs);

    // 2. Stop all camera activity
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // 3. Force-remove any orphaned Bootstrap backdrop that blocks clicks
    // We use a series of timeouts to ensure cleanup happens even if animations are slow
    const cleanup = () => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      const openModalsCount = document.querySelectorAll('.modal.show').length;
      
      if (openModalsCount === 0) {
        backdrops.forEach(el => {
          el.style.display = 'none';
          el.style.pointerEvents = 'none';
        });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
      } else if (backdrops.length > openModalsCount) {
        for (let i = 0; i < backdrops.length - openModalsCount; i++) {
          if (backdrops[i]) {
            backdrops[i].style.display = 'none';
            backdrops[i].style.pointerEvents = 'none';
          }
        }
      }
    };

    setTimeout(cleanup, 300);
    setTimeout(cleanup, 1000); // Robust fallback
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

    // Ensure email is sent as raw string, null if empty
    const payload = { 
      ...formData, 
      email: formData.email?.trim() || null 
    };

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

      // Always send the current state of imageSlots to the backend.
      // Backend will delete existing photos and insert these current ones.
      const embeddingsToSave = imageSlots
        .filter(slot => slot && slot.embedding)
        .map(slot => slot.embedding);

      if (employeeId && embeddingsToSave.length > 0) {
        await saveEmployeeEmbeddings(employeeId, embeddingsToSave);
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

  // ── Archive: open modal ──
  const askArchive = (emp) => {
    setArchiveTargetId(emp.employee_ID);
    setArchiveTargetName(`${emp.employee_firstName} ${emp.employee_LastName}`);
    setShowArchiveConfirm(true);
  };

  const confirmArchive = async () => {
    setShowArchiveConfirm(false);
    try {
      await deleteEmployee(archiveTargetId);
      showFeedback('success', 'Employee archived');
      loadEmployees();
    } catch (err) {
      showFeedback('danger', 'Failed to archive employee');
    } finally {
      setArchiveTargetId(null);
      setArchiveTargetName('');
    }
  };

  const cancelArchive = () => {
    setShowArchiveConfirm(false);
    setArchiveTargetId(null);
    setArchiveTargetName('');
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4500);
  };

  return (
    <div className="admin-page">
      <div className="page-header-section">
        <h1 className="page-title">Employee Management</h1>
        <Button className="create-event-btn" onClick={openAddModal}>+ Add Employee</Button>
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
                <th style={{ width: 160 }}>Actions</th>
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
                      <div className="action-btn-group">
                        <Button
                          className="btn-emp-edit"
                          size="sm"
                          onClick={() => openEditModal(emp)}
                        >
                          Edit
                        </Button>
                        <Button
                          className="btn-emp-archive"
                          size="sm"
                          onClick={() => askArchive(emp)}
                        >
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

        </Card.Body>
      </Card>

      {/* ── Employee Add/Edit Modal ── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="modal-header">
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
              <Form.Control
                type="email"
                name="email"
                placeholder="Enter email address..."
                value={formData.email}
                onChange={handleChange}
              />
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
              <Button className="btn-modal-cancel" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="btn-modal-save" type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Employee' : 'Add Employee'}
              </Button>
            </div>

          </Form>
        </Modal.Body>
      </Modal>

      {/* ── Archive Confirmation Modal ── */}
      <Modal show={showArchiveConfirm} onHide={cancelArchive} centered size="sm" backdrop="static">
        <Modal.Header closeButton className="modal-header">
          <Modal.Title style={{ fontSize: 16 }}>Archive Employee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
            Are you sure you want to archive <strong>{archiveTargetName}</strong>?
            They will be moved to the Employees Archive.
          </p>
        </Modal.Body>
        <Modal.Footer style={{ border: '1px solid #f0f0f0', padding: '14px 24px', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button className="btn-modal-cancel" onClick={cancelArchive}>Cancel</Button>
          <Button className="btn-emp-archive" onClick={confirmArchive}>Yes, Archive</Button>
        </Modal.Footer>
      </Modal>

      {/* Camera Modal */}
      <Modal show={showCamera} onHide={closeCamera} centered size="xl" backdrop="static" onExited={() => {
          // Fallback cleanup if the timeout failed
          const backdrops = document.querySelectorAll('.modal-backdrop');
          if (backdrops.length > 0) {
            const openModalsCount = document.querySelectorAll('.modal.show').length;
            if (openModalsCount === 0) {
              backdrops.forEach(el => {
                if (el) {
                  el.style.display = 'none';
                  el.style.pointerEvents = 'none';
                }
              });
              document.body.classList.remove('modal-open');
            } else if (backdrops.length > openModalsCount) {
               for (let i = 0; i < backdrops.length - openModalsCount; i++) {
                 if (backdrops[i]) {
                   backdrops[i].style.display = 'none';
                   backdrops[i].style.pointerEvents = 'none';
                 }
               }
            }
          }
        }}>
        <Modal.Header closeButton style={{ background: '#1a1a2e', borderBottom: '1px solid #333' }}>
          <Modal.Title style={{ color: '#fff', fontWeight: 700 }}>
             Face Capture — Photo Slot {(cameraSlot ?? 0) + 1}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#1a1a2e', padding: 0 }}>
          <div style={{ display: 'flex', minHeight: 480 }}>

            {/* ── Left: Camera feed with circular guide ── */}
            <div style={{
              flex: '0 0 55%', position: 'relative',
              background: '#000', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Dark overlay with circular cutout */}
              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <mask id="circleMask">
                    <rect width="100" height="100" fill="white" />
                    <ellipse cx="50" cy="50" rx="32" ry="38" fill="black" />
                  </mask>
                </defs>
                <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#circleMask)" />
                {/* Circle border color: green if all met, red if any fail, grey if unchecked */}
                <ellipse cx="50" cy="50" rx="32" ry="38"
                  fill="none"
                  stroke={allAutoReqsMet ? '#28a745' : reqs.faceDetected === false ? '#dc3545' : '#aaa'}
                  strokeWidth="0.6"
                  style={{ filter: `drop-shadow(0 0 4px ${allAutoReqsMet ? '#28a745' : reqs.faceDetected === false ? '#dc3545' : '#aaa'})` }}
                />
              </svg>

              {/* Slot badge */}
              <div style={{
                position: 'absolute', top: 12, left: 12,
                background: 'rgba(40,167,69,0.85)', color: '#fff',
                borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
              }}>
                Slot {(cameraSlot ?? 0) + 1} of {MAX_SLOTS}
              </div>

              {/* All requirements met banner */}
              {allAutoReqsMet && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(40,167,69,0.9)', color: '#fff',
                  borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
                }}>
                  ✅ Ready to capture!
                </div>
              )}
              {/* Inline confirm — replaces window.confirm() */}
{showCaptureConfirm && (
  <div style={{
    position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(30,30,50,0.97)', border: '1px solid #ffc107',
    borderRadius: 10, padding: '12px 20px', zIndex: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    width: '80%',
  }}>
    <span style={{ color: '#ffc107', fontSize: 13, textAlign: 'center' }}>
      ⚠️ Some requirements are not met. Capture anyway?
    </span>
    <div style={{ display: 'flex', gap: 10 }}>
      <Button size="sm" variant="outline-light" onClick={() => setShowCaptureConfirm(false)}>
        Cancel
      </Button>
      <Button size="sm" variant="warning" onClick={doCapture}>
        Capture Anyway
      </Button>
    </div>
  </div>
)}

              {/* Bottom buttons */}
              <div style={{
                position: 'absolute', bottom: 16,
                display: 'flex', gap: 10, justifyContent: 'center', width: '100%',
              }}>
                <Button variant="secondary" onClick={closeCamera} style={{ borderRadius: 20, padding: '6px 22px' }}>
                  Cancel
                </Button>
                <Button variant="success" onClick={capturePhoto} style={{ borderRadius: 20, padding: '6px 22px', fontWeight: 700 }}>
                   Capture
                </Button>
              </div>
            </div>

            {/* ── Right: Live requirements panel ── */}
            <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', borderLeft: '1px solid #2a2a3e' }}>
              <h6 style={{ color: '#28a745', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
                Face Capture Requirements
              </h6>

              {(() => {
                // Each item: { key, icon, label, status }
                // status: true=green, false=red, null=grey (manual/unchecked)
                const items = [
                  { key: 'faceDetected',        label: 'Face detected in frame.',                                           status: reqs.faceDetected },
                  { key: 'faceCentered',        label: 'Face is centered inside the circular guide.',                       status: reqs.faceCentered },
                  { key: 'faceInsideCircle',    label: 'Face fits within the recognition circle outline.',                 status: reqs.faceInsideCircle },
                  { key: 'fullFaceVisible',     label: 'Full face visible — forehead to chin.',                            status: reqs.fullFaceVisible },
                  { key: 'neutralExpression',   label: 'Neutral expression maintained.',                                   status: reqs.neutralExpression },
                  { key: 'eyesOpen',            label: 'Both eyes open and clearly visible.',                             status: reqs.eyesOpen },
                  { key: 'goodDistance',        label: 'Correct distance — not too close or too far.',                    status: reqs.goodDistance },
                  { key: 'headUpright',         label: 'Head upright, looking directly at the camera — no tilting.',     status: reqs.headUpright },
                  { key: 'noHat',               label: 'No hats or head coverings (unless religious).',                 status: null },
                  { key: 'noGlasses',           label: 'No sunglasses or tinted glasses.',                             status: null },
                ];

                return (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map((item) => {
                      const color  = item.status === true  ? '#28a745'
                                   : item.status === false ? '#dc3545'
                                   : '#888';
                      const bg     = item.status === true  ? 'rgba(40,167,69,0.10)'
                                   : item.status === false ? 'rgba(220,53,69,0.10)'
                                   : 'transparent';
                      const bullet = item.status === true  ? '✅'
                                   : item.status === false ? '❌'
                                   : '⬜';
                      return (
                        <li key={item.key} style={{
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                          background: bg, borderRadius: 6, padding: '6px 8px',
                          border: `1px solid ${item.status === true ? 'rgba(40,167,69,0.25)' : item.status === false ? 'rgba(220,53,69,0.25)' : 'transparent'}`,
                          transition: 'all 0.2s',
                        }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{bullet}</span>
                          <span style={{ fontSize: 12, color, lineHeight: 1.5, transition: 'color 0.2s' }}>
                            {item.label}
                            {item.status === null && item.key !== 'faceDetected' && (
                              <span style={{ fontSize: 10, color: '#666', marginLeft: 6 }}>(check manually)</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}

              {/* Warning banner */}
              <div style={{
                marginTop: 16, background: 'rgba(255,193,7,0.12)',
                border: '1px solid rgba(255,193,7,0.4)',
                borderRadius: 8, padding: '10px 12px',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: 11.5, color: '#ffc107', lineHeight: 1.5 }}>
                  Make sure your face fits properly inside the circle for accurate detection.
                </span>
              </div>

              {/* Models not loaded warning */}
              {!modelsLoadedRef.current && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#888', textAlign: 'center' }}>
                  Loading face detection models…
                </div>
              )}
            </div>
          </div>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default EmployeesPage;