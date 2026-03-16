import React, { useState, useRef, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Modal, Form } from 'react-bootstrap';
import './LandingPage.css';
import { getEvents, getEmployees, markAttendance } from '../api';
import LoginPage from './Adminlogin';



function EmployeePage({ onBack, onNavigateAdmin }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [eventExpanded, setEventExpanded] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [attendanceType, setAttendanceType] = useState('');
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const [manualMode, setManualMode]         = useState(false);
  const [manualId, setManualId]             = useState('');
  const [manualError, setManualError]       = useState('');
  const [manualSearched, setManualSearched] = useState(false);
  const [employees, setEmployees]           = useState([]);
  const [dataLoading, setDataLoading]       = useState(false);
  const [dataError, setDataError]           = useState('');

  const handleManualIdKey = (digit) => {
    setManualError('');
    setManualSearched(false);
    setManualId(prev => prev + digit);
  };

  const handleManualBackspace = () => {
    setManualError('');
    setManualSearched(false);
    setManualId(prev => prev.slice(0, -1));
  };

  const handleManualClear = () => {
    setManualId('');
    setManualError('');
    setManualSearched(false);
  };

  const handleManualSearch = () => {
    if (!manualId.trim()) {
      setManualError('Please enter an employee ID.');
      return;
    }
    if (!employees.length) {
      setManualError('Employee data is not loaded yet. Please try again in a moment.');
      return;
    }

    setManualSearched(true);

    const normalizedInput = manualId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const found = employees.find(emp => {
      const codeRaw = String(emp.employee_code || '');
      const codeNoDash = codeRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return (
        codeNoDash === normalizedInput ||
        codeRaw.toLowerCase() === manualId.toLowerCase()
      );
    });

    if (found) {
      setRecognizedUser({
        name: `${found.employee_firstName} ${found.employee_LastName}`,
        id: found.employee_code,
        department: found.department_name,
        role: found.position,
        employeeId: found.employee_ID,
        lastAction: null,
        photo: null
      });
      setManualError('');
    } else {
      setManualError('No employee found with that ID. Please try again.');
      setRecognizedUser(null);
    }
  };

  const handleExitManualMode = () => {
    setManualMode(false);
    setManualId('');
    setManualError('');
    setManualSearched(false);
    setRecognizedUser(null);
  };

  const [clockTapCount, setClockTapCount] = useState(0);
  const clockTapTimer                     = useRef(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleClockTap = () => {
    const next = clockTapCount + 1;
    setClockTapCount(next);
    clearTimeout(clockTapTimer.current);
    if (next >= 5) {
      setClockTapCount(0);
      setShowAdminLogin(true);
    } else {
      clockTapTimer.current = setTimeout(() => setClockTapCount(0), 2000);
    }
  };

  const [availableEvents, setAvailableEvents] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setDataLoading(true);
        setDataError('');

        const [eventsData, employeesData] = await Promise.all([
          getEvents({ archived: 0 }),
          getEmployees(),
        ]);

        const eventsArr = Array.isArray(eventsData) ? eventsData : (eventsData?.data ?? []);
        if (Array.isArray(eventsArr)) {
          const formattedEvents = eventsArr.map(event => ({
            id: event.event_ID,
            name: event.event_name,
            time: event.event_time ?? event.time ?? '',
            description: event.description ?? event.event_desc ?? '',
            type: event.eventtype_name ?? event.eventtype ?? '',
          }));
          setAvailableEvents(formattedEvents);
        }

        const empArr = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);
        // Only load active employees (is_archived != 1)
        const activeEmps = (Array.isArray(empArr) ? empArr : []).filter(e => e.is_archived != 1);
        setEmployees(activeEmps);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setDataError(error.message || 'Failed to load events or employees.');
      } finally {
        setDataLoading(false);
      }
    };

    loadInitialData();
  }, []);


  useEffect(() => {
    if (availableEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(availableEvents[0].id.toString());
    }
  }, [availableEvents, selectedEvent]);

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true });
  };

  const getSelectedEventDetails = () => {
    return availableEvents.find(event => event.id.toString() === selectedEvent);
  };

  useEffect(() => {
    if (cameraActive && !recognizedUser && !isDetecting) {
      setIsDetecting(true);
   
      const detectionTimer = setTimeout(() => {
        if (employees.length) {
          const first = employees[0];
          const detectedEmployee = {
            name: `${first.employee_firstName} ${first.employee_LastName}`,
            id: first.employee_code,
            department: first.department_name,
            role: first.position,
            employeeId: first.employee_ID,
            photo: null,
            lastAction: null
          };
          
          setRecognizedUser(detectedEmployee);
        }
        setIsDetecting(false);
      }, 3000);

      return () => clearTimeout(detectionTimer);
    }
  }, [cameraActive, recognizedUser, isDetecting, employees]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
      setRecognizedUser(null);
      setIsDetecting(false);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setRecognizedUser(null);
    setIsDetecting(false);
  };


  const submitAttendance = async (type) => {
    if (!recognizedUser) {
      alert('No employee recognized yet.');
      return;
    }

    if (!selectedEvent) {
      alert('Please select an event first.');
      return;
    }

    try {
      const response = await markAttendance({
        employee_id: recognizedUser.employeeId || recognizedUser.id,
        event_id: selectedEvent,
        attendance_type: type,
      });

      if (response && (response.success || !response.error)) {
        setAttendanceType(type);
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          resetToInitialState();
        }, 2000);
      } else {
        // Show the error message from the server (e.g. "Already checked in")
        alert(response?.message || `Failed to ${type.toLowerCase()}. Please try again.`);
      }
    } catch (error) {
      console.error('Failed to record attendance:', error);
      alert(error.message || 'Server error. Please check your connection.');
    }
  };

  const handleCheckIn = async () => {
    await submitAttendance('Check In');
  };

  const handleCheckOut = async () => {
    await submitAttendance('Check Out');
  };

  const handleScanDifferent = () => {
    setRecognizedUser(null);
    setIsDetecting(false);
  };

  const resetToInitialState = () => {
    stopCamera();
    setRecognizedUser(null);
    setAttendanceType('');
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const selectedEventDetails = getSelectedEventDetails();

  return (
    <div className="app-container" style={{
      backgroundImage: `url(${process.env.PUBLIC_URL}/BG.png)`
    }}>
      <div className="background-overlay"></div>

   
      <div className="logo-container logo-left">
        <img 
          src={`${process.env.PUBLIC_URL}/LOGO.png`} 
          alt="Pasig City Logo" 
          className="logo"
        />
      </div>

      <div className="logo-container logo-right">
        <img 
          src={`${process.env.PUBLIC_URL}/ccs.png`} 
          alt="CCS Logo" 
          className="logo"
        />
      </div>

      <Container fluid className="main-content px-4">
        <Row className="justify-content-center">
          <Col xs={12} lg={11} xl={10} xxl={9}>
            {/* Date and Time Display */}
            <Card className="datetime-card shadow-lg" onClick={handleClockTap} style={{ cursor: 'default', userSelect: 'none' }}>
              <Card.Body className="text-center">
                <div className="date-display">{formatDate(currentTime)}</div>
                <div className="time-display">{formatTime(currentTime)}</div>
                <div className="flag-ceremony-info">Flag Ceremony: 7:30 AM</div>
              </Card.Body>
            </Card>

            <Card className="event-card shadow-lg">
              <Card.Body>
                <h5 className="mb-2 fw-bold">
                  <i className="bi bi-calendar-event me-2 text-success"></i>
                  Select Event
                </h5>

                <Form.Group className="mb-2">
                  <Form.Select 
                    size="lg"
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="event-selector"
                  >
                    <option value="">Choose an event...</option>
                    {availableEvents.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} - {event.time}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {selectedEventDetails && (
                  <Card className="border event-detail-card">
                    <Card.Header 
                      className="event-header d-flex align-items-center cursor-pointer"
                      onClick={() => setEventExpanded(!eventExpanded)}
                    >
                      <Badge 
                        bg={selectedEventDetails.type === 'Flag' ? 'success' : 
                            selectedEventDetails.type === 'Meeting' ? 'primary' : 'info'} 
                        className="me-2"
                      >
                        {selectedEventDetails.type}
                      </Badge>
                      <span className="flex-grow-1 fw-semibold">{selectedEventDetails.name}</span>
                      <span className="text-muted me-2">({selectedEventDetails.time})</span>
                      <i className={`bi bi-chevron-${eventExpanded ? 'up' : 'down'}`}></i>
                    </Card.Header>
                    {eventExpanded && (
                      <Card.Body className="event-details">
                        <h6 className="text-success fw-bold mb-2">{selectedEventDetails.name}</h6>
                        <p className="mb-2">
                          <i className="bi bi-info-circle me-2"></i>
                          {selectedEventDetails.description}
                        </p>
                        <div className="d-flex gap-3 text-muted small">
                          <span>
                            <i className="bi bi-clock me-1"></i>
                            {selectedEventDetails.time}
                          </span>
                          <span>
                            <i className="bi bi-calendar-check me-1"></i>
                            {formatDate(currentTime)}
                          </span>
                        </div>
                      </Card.Body>
                    )}
                  </Card>
                )}
              </Card.Body>
            </Card>

            <Card className="camera-card shadow-lg">
              <Card.Body>

                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0 fw-bold">
                    {manualMode
                      ? <><i className="bi bi-keyboard me-2 text-warning"></i>Manual ID Entry</>
                      : <><i className="bi bi-camera-video me-2 text-primary"></i>Face Recognition</>}
                  </h5>
                  <button
                    className={`camera-fallback-toggle ${manualMode ? 'toggle-active' : ''}`}
                    onClick={() => {
                      if (manualMode) {
                        handleExitManualMode();
                      } else {
                        stopCamera();
                        setManualMode(true);
                      }
                    }}
                    title={manualMode ? 'Switch back to camera' : 'Camera down? Use ID instead'}
                  >
                    {manualMode
                      ? <><i className="bi bi-camera-video"></i> Use Camera</>
                      : <><i className="bi bi-keyboard"></i> Camera Down?</>}
                  </button>
                </div>

                {/* ── CAMERA MODE  */}
                {!manualMode && (
                  <>
                    <div className="camera-display-wrapper-wide mb-2">
                      {!cameraActive ? (
                        <div className="camera-placeholder">
                          <i className="bi bi-camera camera-icon-large"></i>
                          <h4 className="mt-3 fw-bold">Camera Ready</h4>
                          <p className="text-muted">Click "Scan Face" to begin</p>
                        </div>
                      ) : (
                        <div className="camera-video-container">
                          <video ref={videoRef} autoPlay playsInline className="camera-video" />
                          {isDetecting && (
                            <div className="detection-overlay">
                              <div className="spinner-border text-light" role="status" style={{ width: '4rem', height: '4rem' }}>
                                <span className="visually-hidden">Detecting face...</span>
                              </div>
                              <p className="text-white mt-3 fw-semibold fs-5">Detecting face...</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!recognizedUser && (
                      <div className="d-grid">
                        <Button
                          variant={cameraActive ? 'danger' : 'success'}
                          size="lg"
                          onClick={cameraActive ? stopCamera : startCamera}
                          className="camera-control-btn"
                          disabled={!selectedEvent}
                        >
                          <i className={`bi bi-${cameraActive ? 'camera-video-off' : 'camera-video'} me-2`}></i>
                          {cameraActive ? 'Stop Camera' : 'Scan Face'}
                        </Button>
                        {!selectedEvent && (
                          <small className="text-danger text-center mt-2">
                            <i className="bi bi-exclamation-circle me-1"></i>
                            Please select an event first
                          </small>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── MANUAL ID MODE  */}
                {manualMode && !recognizedUser && (
                  <div className="manual-id-section">
                    <div className="manual-id-display-wrapper">
                      <div className="manual-id-label">
                        <i className="bi bi-person-badge me-2"></i>Employee ID
                      </div>
                      <div className={`manual-id-display ${manualError ? 'manual-id-error' : ''}`}>
                        {manualId || <span className="manual-id-placeholder">e.g. 23-00001</span>}
                      </div>
                      {manualError && (
                        <div className="manual-error-msg">
                          <i className="bi bi-exclamation-circle me-1"></i>{manualError}
                        </div>
                      )}
                    </div>

                    {/* Number keypad */}
                    <div className="manual-keypad">
                      {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key, i) => (
                        <button
                          key={i}
                          className={`manual-key ${key === 'C' ? 'manual-key-clear' : ''} ${key === '⌫' ? 'manual-key-back' : ''}`}
                          onClick={() => {
                            if (key === '⌫') handleManualBackspace();
                            else if (key === 'C') handleManualClear();
                            else handleManualIdKey(key);
                          }}
                        >
                          {key}
                        </button>
                      ))}
                    </div>

                    {/* Also allow dash for formatted IDs */}
                    <div className="manual-keypad-extra">
                      <button className="manual-key manual-key-dash" onClick={() => handleManualIdKey('-')}>—</button>
                    </div>

                    <Button
                      variant="success"
                      size="lg"
                      className="w-100 mt-3 camera-control-btn"
                      onClick={handleManualSearch}
                      disabled={!selectedEvent || !manualId.trim()}
                    >
                      <i className="bi bi-search me-2"></i>
                      Find Employee
                    </Button>
                    {!selectedEvent && (
                      <small className="text-danger text-center d-block mt-2">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        Please select an event first
                      </small>
                    )}
                  </div>
                )}

                {/* ── RECOGNIZED / FOUND USER CARD  */}
                {recognizedUser && (
                  <Card className="user-recognition-card border-0 bg-light">
                    <Card.Body className="p-4">
                      {manualMode && (
                        <div className="manual-found-badge">
                          <i className="bi bi-keyboard me-1"></i>Found via Manual ID
                        </div>
                      )}
                      <div className="d-flex align-items-start mb-4 pb-3 border-bottom">
                        <div className="user-avatar-circle me-3">
                          <i className="bi bi-person-fill"></i>
                        </div>
                        <div className="flex-grow-1">
                          <h4 className="mb-2 fw-bold">{recognizedUser.name}</h4>
                          <div className="text-muted mb-2 fs-6">
                            <i className="bi bi-person-badge me-1"></i>
                            {recognizedUser.id}
                          </div>
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-geo-alt-fill text-success me-2"></i>
                            <span className="text-success">{recognizedUser.department}</span>
                          </div>
                          <Badge bg="success" className="px-3 py-2">{recognizedUser.role}</Badge>
                        </div>
                      </div>

                      {selectedEventDetails && (
                        <div className="alert alert-info mb-3" role="alert">
                          <i className="bi bi-calendar-check me-2"></i>
                          <strong>Event:</strong> {selectedEventDetails.name}
                        </div>
                      )}

                      <Row className="g-3 mb-3">
                        <Col sm={6}>
                          <Button variant="success" className="w-100 py-3 fw-bold fs-5" onClick={handleCheckIn}>
                            <i className="bi bi-box-arrow-in-right me-2"></i>Check In
                          </Button>
                        </Col>
                        <Col sm={6}>
                          <Button variant="danger" className="w-100 py-3 fw-bold fs-5" onClick={handleCheckOut}>
                            <i className="bi bi-box-arrow-right me-2"></i>Check Out
                          </Button>
                        </Col>
                      </Row>

                      <div className="d-grid">
                        <Button
                          variant="outline-secondary"
                          size="lg"
                          onClick={() => {
                            if (manualMode) {
                              setRecognizedUser(null);
                              setManualId('');
                              setManualError('');
                              setManualSearched(false);
                            } else {
                              handleScanDifferent();
                            }
                          }}
                        >
                          <i className={`bi bi-${manualMode ? 'arrow-left' : 'arrow-repeat'} me-2`}></i>
                          {manualMode ? 'Enter Different ID' : 'Scan Different Face'}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>

            {/* Instructions */}
            <Card className="instructions-card shadow-lg">
              <Card.Body>
                <h5 className="mb-2 fw-bold">
                  <i className="bi bi-info-circle me-2 text-primary"></i>
                  Instructions
                </h5>
                <ol className="mb-0 fs-6">
                  <li className="mb-1">Select an event from the dropdown menu above</li>
                  <li className="mb-1">Click <strong>"Scan Face"</strong> to activate face recognition</li>
                  <li className="mb-1">Position your face clearly in front of the camera</li>
                  <li className="mb-1">Wait for the system to recognize your face (3-5 seconds)</li>
                  <li className="mb-1">Verify the event shown is correct</li>
                  <li>Choose <strong>"Check In"</strong> or <strong>"Check Out"</strong> to record attendance</li>
                </ol>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Confirmation Modal */}
      <Modal 
        show={showConfirmation} 
        centered
        backdrop="static"
        className="confirmation-modal"
      >
        <Modal.Body className="text-center py-5">
          <div className="success-icon mb-3">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <h3 className="mb-3 fw-bold">{attendanceType} Successful!</h3>
          <h4 className="text-success mb-2">{recognizedUser?.name}</h4>
          {selectedEventDetails && (
            <p className="text-primary mb-2 fs-5">
              <i className="bi bi-calendar-event me-2"></i>
              {selectedEventDetails.name}
            </p>
          )}
          <p className="text-muted fs-5 mb-0">{formatTime(new Date())}</p>
          <div className="mt-4">
            <div className="spinner-border spinner-border-sm text-success" role="status">
              <span className="visually-hidden">Processing...</span>
            </div>
            <p className="small text-muted mt-2">Returning to camera...</p>
          </div>
        </Modal.Body>
      </Modal>

      <link 
        rel="stylesheet" 
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
      />

      {/* Admin Login Overlay — shown after 5 taps on the clock */}
      {showAdminLogin && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }}>
          <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
          <LoginPage onBackToScanner={() => setShowAdminLogin(false)} />
        </div>
      )}
    </div>
  );
}

export default EmployeePage;
