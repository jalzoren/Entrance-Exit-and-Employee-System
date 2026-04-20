import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Modal } from 'react-bootstrap';
import { getEntryExitLogs, getAttendance, getEmployees, getEvents } from '../api';
import './ccs/entryexit.css';

function EntryExitPage() {

  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // XML Modal States
  const [showXMLModal, setShowXMLModal] = useState(false);
  const [xmlContent, setXmlContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Custom Alert Modal States
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // ===============================
  // LOAD DATA FROM DATABASE
  // ===============================

  useEffect(() => {
    loadLogs();
    // Auto-refresh logs every 5 seconds for "live" updates
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all required data sources to fill missing fields
      const [eeData, attendanceData, employeesData, eventsData] = await Promise.all([
        getEntryExitLogs(),
        getAttendance(),
        getEmployees(),
        getEvents()
      ]);

      const rawEE = Array.isArray(eeData) ? eeData : [];
      const rawAttendance = Array.isArray(attendanceData) ? attendanceData : (attendanceData?.data ?? []);
      const allEmployees = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);
      const allEvents = Array.isArray(eventsData) ? eventsData : (eventsData?.data ?? []);

      // Normalize all logs into a single format
      const normalizedLogs = [
        ...rawEE.map(log => ({
          ...log,
          timestamp: log.timestamp || log.time_in || log.time_out || '',
          type: log.type || 'Entry',
          method: log.method || 'face'
        })),
        ...rawAttendance.map(att => {
          const emp = allEmployees.find(e => String(e.employee_ID) === String(att.employee_ID) || String(e.employee_code) === String(att.employee_code));
          const evt = allEvents.find(e => String(e.event_ID) === String(att.event_ID));
          
          return {
            timestamp: att.time_in || att.time_out || att.timestamp || '',
            type: att.time_out && att.time_out !== '0000-00-00 00:00:00' ? 'Exit' : 'Entry',
            employee_code: att.employee_code || emp?.employee_code || '',
            fullName: att.fullName || (emp ? `${emp.employee_firstName} ${emp.employee_LastName}` : 'Unknown'),
            department_name: att.department_name || emp?.department_name || '',
            location: att.location_name || evt?.location_name || att.event_name || 'Event',
            method: att.method || 'face'
          };
        })
      ];

      // Remove duplicates and sort by timestamp
      const uniqueLogs = Array.from(new Map(normalizedLogs.map(item => [item.timestamp + item.employee_code, item])).values())
        .filter(log => log.timestamp && log.timestamp !== '0000-00-00 00:00:00')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setLogs(uniqueLogs);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setError(err.message || 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // FILTERING
  // ===============================

  const filteredLogs = logs.filter(log => {

    const matchesSearch =
      log.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employee_code.toString().includes(searchTerm);

    const matchesDepartment =
      selectedDepartment === 'All Departments' ||
      log.department_name === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // ===============================
  // STATS
  // ===============================

  const totalEntries = logs.filter(log => log.type === 'Entry').length;
  const totalExits = logs.filter(log => log.type === 'Exit').length;
  const totalMovements = logs.length;

  const departments = [
    'All Departments',
    ...new Set(logs.map(log => log.department_name).filter(Boolean))
  ];

  const getTypeBadgeClass = (type) =>
    (type === 'Entry' || type === 'Check In' || type?.toLowerCase()?.includes('in')) ? 'badge-entry' : 'badge-exit';

  const getTypeIcon = (type) =>
    (type === 'Entry' || type === 'Check In' || type?.toLowerCase()?.includes('in')) ? 'bi-arrow-down-left' : 'bi-arrow-up-right';

  const formatTypeName = (type) => {
    if (type?.toLowerCase()?.includes('in') || type === 'Entry') return 'Entry';
    if (type?.toLowerCase()?.includes('out') || type === 'Exit') return 'Exit';
    return type || 'N/A';
  };

  // ===============================
  // EXPORT TO XML
  // ===============================

  const generateXMLString = () => {
    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlString += '<AttendanceLogs>\n';
    filteredLogs.forEach(log => {
      xmlString += '  <Log>\n';
      xmlString += `    <Timestamp>${log.timestamp}</Timestamp>\n`;
      xmlString += `    <Type>${log.type}</Type>\n`;
      xmlString += `    <EmployeeCode>${log.employee_code}</EmployeeCode>\n`;
      xmlString += `    <FullName>${log.fullName.replace(/&/g, '&amp;')}</FullName>\n`;
      xmlString += `    <Department>${(log.department_name || '').replace(/&/g, '&amp;')}</Department>\n`;
      xmlString += `    <Method>${(log.method || 'Face').replace(/&/g, '&amp;')}</Method>\n`;
      xmlString += `    <Location>${(log.location || 'Main Gate').replace(/&/g, '&amp;')}</Location>\n`;
      xmlString += '  </Log>\n';
    });
    xmlString += '</AttendanceLogs>';
    return xmlString;
  };

  const handleViewXML = () => {
    if (filteredLogs.length === 0) {
      setAlertMessage("No data available to display.");
      setShowAlertModal(true);
      return;
    }
    setXmlContent(generateXMLString());
    setShowXMLModal(true);
    setCopySuccess(false);
  };

  const handleDownloadXML = () => {
    const xmlString = generateXMLString();
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Logs_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // ===============================
  // UI
  // ===============================

  return (
    <div className="admin-page">

      <div className="page-header-section d-flex justify-content-between align-items-center">
        <h1 className="page-title">Entrance & Exit Logs</h1>
        <Button 
          variant="outline-primary" 
          onClick={handleViewXML}
          className="d-flex align-items-center gap-2"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            borderColor: 'rgba(255, 255, 255, 0.5)',
            color: 'white',
            fontWeight: '600',
            borderRadius: '10px',
            padding: '10px 20px'
          }}
        >
          <i className="bi bi-file-earmark-code"></i>
          View XML
        </Button>
      </div>

      {/* ================= STATS ================= */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="stat-card-ee">
            <Card.Body>
              <p>Total Movements</p>
              <h2>{totalMovements}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card-ee">
            <Card.Body>
              <p>Entries</p>
              <h2>{totalEntries}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card-ee">
            <Card.Body>
              <p>Exits</p>
              <h2>{totalExits}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= TABLE ================= */}
      <Card className="content-card">
        <Card.Body>

          {error && (
            <div className="alert alert-danger mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <Button variant="link" className="p-0 ms-2" onClick={loadLogs}>Retry</Button>
            </div>
          )}

          <Row className="mb-3">
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="Search name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                {departments.map((dept, index) => (
                  <option key={index}>{dept}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Method</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>

                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Loading logs...
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => (
                    <tr key={index}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>

                      <td>
                        <span className={`type-badge-ee ${getTypeBadgeClass(log.type)}`} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                          <i className={`bi ${getTypeIcon(log.type)} me-1`}></i>
                          {formatTypeName(log.type)}
                        </span>
                      </td>

                      <td className="fw-bold">{log.employee_code}</td>
                      <td className="fw-bold text-dark">{log.fullName}</td>
                      <td>{log.department_name || <span className="text-muted small">N/A</span>}</td>
                      <td>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          textTransform: 'uppercase',
                          color: log.method?.toLowerCase() === 'qr' ? '#0d47a1' : log.method?.toLowerCase() === 'manual' ? '#856404' : '#1a5f2e',
                          background: log.method?.toLowerCase() === 'qr' ? '#e3f2fd' : log.method?.toLowerCase() === 'manual' ? '#fff3cd' : '#e9f5ec',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${log.method?.toLowerCase() === 'qr' ? '#bbdefb' : log.method?.toLowerCase() === 'manual' ? '#ffeeba' : '#c3e6cb'}`
                        }}>
                          {log.method || 'Face'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{log.location}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      No logs found
                    </td>
                  </tr>
                )}

              </tbody>
            </Table>
          </div>

        </Card.Body>
      </Card>

      {/* XML Viewer Modal */}
      <Modal show={showXMLModal} onHide={() => setShowXMLModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton style={{ background: '#1a5f2e', color: 'white' }}>
          <Modal.Title style={{ fontSize: '18px', fontWeight: '700' }}>
            <i className="bi bi-file-earmark-code me-2"></i>
            XML Data Preview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#f8f9fa' }}>
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Showing {filteredLogs.length} record(s) in XML format
            </span>
            <div className="d-flex gap-2">
              <Button 
                variant={copySuccess ? "success" : "outline-primary"} 
                size="sm" 
                onClick={handleCopyToClipboard}
              >
                <i className={`bi bi-${copySuccess ? 'check-lg' : 'clipboard'} me-1`}></i>
                {copySuccess ? 'Copied!' : 'Copy XML'}
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleDownloadXML}
              >
                <i className="bi bi-download me-1"></i>
                Download .xml
              </Button>
            </div>
          </div>
          <pre style={{ 
            backgroundColor: '#1e1e1e', 
            color: '#d4d4d4', 
            padding: '15px', 
            borderRadius: '8px',
            fontSize: '13px',
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #333'
          }}>
            {xmlContent}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowXMLModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal 
        show={showAlertModal} 
        onHide={() => setShowAlertModal(false)} 
        size="sm" 
        centered
        backdrop="static"
      >
        <Modal.Body className="text-center py-4">
          <div className="mb-3">
            <i className="bi bi-exclamation-circle text-warning" style={{ fontSize: '48px' }}></i>
          </div>
          <h5 className="fw-bold mb-2">Attention</h5>
          <p className="text-muted mb-4">{alertMessage}</p>
          <Button 
            variant="dark" 
            className="px-4" 
            onClick={() => setShowAlertModal(false)}
            style={{ borderRadius: '8px' }}
          >
            OK
          </Button>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default EntryExitPage;