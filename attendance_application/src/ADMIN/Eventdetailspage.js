import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { getEventAttendance } from '../api';
import './ccs/event.css';

function EventDetailsPage({ onNavigate, eventData }) {

  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');

  const event_ID = eventData?.event_ID;
  const eventName = eventData?.event_name || 'Event';

  // ===============================
  // LOAD DATA FROM DATABASE
  // ===============================

  useEffect(() => {
    if (event_ID) {
      loadAttendance();
    }
  }, [event_ID]);

  const loadAttendance = async () => {
    const data = await getEventAttendance(event_ID);
    setRecords(data);
  };

  // ===============================
  // CALCULATIONS
  // ===============================

  const totalAttended = records.filter(r => r.attended).length;
  const totalMissed = records.filter(r => !r.attended).length;
  const rate = records.length
    ? ((totalAttended / records.length) * 100).toFixed(1)
    : 0;

  const departments = [
    'All Departments',
    ...new Set(records.map(r => r.department_name))
  ];

  const filtered = records.filter(r => {
    const q = searchTerm.toLowerCase();

    const matchSearch =
      r.fullName.toLowerCase().includes(q) ||
      r.employee_code.toString().includes(q);

    const matchDept =
      selectedDept === 'All Departments' ||
      r.department_name === selectedDept;

    return matchSearch && matchDept;
  });

  // ===============================
  // EXPORT CSV
  // ===============================

  const handleExportLog = () => {
    const headers = [
      'Employee Code',
      'Name',
      'Department',
      'Check-In Time',
      'Check-Out Time',
      'Attended',
      'Status'
    ];

    const rows = records.map(r => [
      r.employee_code,
      r.fullName,
      r.department_name,
      r.checkIn || '--------',
      r.checkOut || '--------',
      r.attended ? 'Attended' : 'Not Attended',
      r.status || '--------'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName}_attendance.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // ===============================
  // UI
  // ===============================

  return (
    <div className="admin-page">

      <div className="page-header-section">
        <h1 className="page-title">
          Event Details ({eventName})
        </h1>

        <Button onClick={() => onNavigate('events')}>
          Back to Events
        </Button>
      </div>

      {/* ================= STAT CARDS ================= */}

      <Row className="g-3 mb-4">

        <Col md={4}>
          <Card className="stat-card-glass">
            <Card.Body>
              <p>Attended</p>
              <h2>{totalAttended}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card-glass">
            <Card.Body>
              <p>Not Attended</p>
              <h2 className="danger">{totalMissed}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card-glass">
            <Card.Body>
              <p>Attendance Rate</p>
              <h2>{rate}%</h2>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* ================= RECORD TABLE ================= */}

      <Card className="content-card">
        <Card.Body>

          <div className="card-header-section">
            <div>
              <h5>Attendance Records</h5>
            </div>

            <Button onClick={handleExportLog}>
              Export Log
            </Button>
          </div>

          <Row className="g-2 mb-3">

            <Col md={6}>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <select
                className="filter-select"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                {departments.map((dept, index) => (
                  <option key={index}>{dept}</option>
                ))}
              </select>
            </Col>

          </Row>

          <div className="table-responsive">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Attended</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>

                {filtered.length > 0 ? (
                  filtered.map((r, index) => (
                    <tr key={index}>
                      <td>{r.employee_code}</td>
                      <td>{r.fullName}</td>
                      <td>{r.department_name}</td>
                      <td>{r.checkIn || '--------'}</td>
                      <td>{r.checkOut || '--------'}</td>
                      <td>
                        {r.attended
                          ? <span className="pill-attended">Attended</span>
                          : <span className="pill-absent">Not Attended</span>}
                      </td>
                      <td>
                        {r.status || '--------'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      No records found
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>

          <div className="table-footer">
            Showing {filtered.length} of {records.length} employees
          </div>

        </Card.Body>
      </Card>

    </div>
  );
}

export default EventDetailsPage;
