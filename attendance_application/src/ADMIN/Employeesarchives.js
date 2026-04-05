import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Badge, Modal } from 'react-bootstrap';
import {
  getEmployees,
  getDepartments,
  getPositions,
  restoreEmployee,
} from '../api';
import './ccs/archives.css';
import InfoTooltip from "../components/InfoTooltip";

function EmployeesArchive({ onNavigate }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedPosition, setSelectedPosition] = useState('All Positions');

  const [viewMode, setViewMode] = useState('list');

  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  // ── Confirmation modal state ──
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // employee object

  // =========================================
  // LOAD DATA
  // =========================================

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      setLoadError('');
      const [empsData, deptData, posData] = await Promise.all([
        getEmployees({ archived: 1 }),
        getDepartments(),
        getPositions(),
      ]);

      const empList = Array.isArray(empsData) ? empsData : (empsData?.data ?? []);
      const deptList = Array.isArray(deptData) ? deptData : (deptData?.data ?? []);
      const posList = Array.isArray(posData) ? posData : (posData?.data ?? []);

      const archivedOnly = empList.filter(e => e.is_archived == 1 || e.is_archived === true);

      setEmployees(archivedOnly.length > 0 ? archivedOnly : empList);
      setDepartments(deptList);
      setPositions(posList);
    } catch (err) {
      console.error('Failed to load employee archive:', err);
      setLoadError('Unable to load archived employees. Please check your server/API.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Open confirmation modal ──
  const askRestore = (employee) => {
    setConfirmTarget(employee);
    setShowConfirmModal(true);
  };

  const confirmRestore = async () => {
    if (!confirmTarget) return;
    setShowConfirmModal(false);
    try {
      setActionMessage('');
      await restoreEmployee(confirmTarget.employee_ID);
      await loadAll();
      setActionMessage('Employee restored successfully.');
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err) {
      console.error('Failed to restore employee:', err);
      setActionMessage(err?.message || 'Failed to restore employee.');
      setTimeout(() => setActionMessage(''), 5000);
    } finally {
      setConfirmTarget(null);
    }
  };

  const cancelRestore = () => {
    setShowConfirmModal(false);
    setConfirmTarget(null);
  };

  // =========================================
  // FILTER HELPERS
  // =========================================

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.employee_firstName} ${emp.employee_LastName}`;
    const q = searchTerm.toLowerCase();

    const matchSearch =
      fullName.toLowerCase().includes(q) ||
      String(emp.employee_code).includes(q) ||
      (emp.position || '').toLowerCase().includes(q);

    const matchDept =
      selectedDepartment === 'All Departments' ||
      emp.department_name === selectedDepartment;

    const matchPos =
      selectedPosition === 'All Positions' ||
      emp.position === selectedPosition;

    return matchSearch && matchDept && matchPos;
  });

  const departmentCounts = employees.reduce((acc, emp) => {
    const found = acc.find(d => d.name === emp.department_name);
    if (found) {
      found.count += 1;
    } else {
      acc.push({ name: emp.department_name, count: 1 });
    }
    return acc;
  }, []);

  const totalArchived = employees.length;
  const uniqueDepartments = departmentCounts.length;
  const uniquePositions = [...new Set(employees.map(e => e.position))].filter(Boolean).length;

  // =========================================
  // UI
  // =========================================

  return (
    <div className="archive-page">
      {/* ===== HEADER ===== */}
      <div className="archive-header-section">
        <div className="archive-title-block">
          <div className="archive-eyebrow">
            <span className="archive-eyebrow-dot" />
            Historical Records
          </div>
          <h1 className="archive-title">Employees Archive</h1>
          <p className="archive-subtitle">
            Browse and review all past employee records
          </p>
        </div>
        <Button className="back-btn" onClick={() => onNavigate('employees')}>
          ← Back to Employees
        </Button>
      </div>

      {/* ===== STAT STRIP ===== */}
      <div className="archive-stat-strip">
        <div className="archive-stat-item">
          <span className="archive-stat-value">{totalArchived}</span>
          <span className="archive-stat-label">
            Archived Employees <InfoTooltip text="Total number of archived employee records" />
          </span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat-item">
          <span className="archive-stat-value">{uniqueDepartments}</span>
          <span className="archive-stat-label">
            Departments <InfoTooltip text="Number of departments with archived employees" />
          </span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat-item">
          <span className="archive-stat-value">{uniquePositions}</span>
          <span className="archive-stat-label">
            Positions <InfoTooltip text="Number of unique positions among archived employees" />
          </span>
        </div>
      </div>

      {/* ===== FILTERS + TABLE MERGED CARD ===== */}
      <Card className="archive-filter-card">
        <Card.Body>

          {/* — Filter Header — */}
          <div className="archive-filter-header">
            <span className="archive-filter-title">🗂 Filter Archive</span>
            <div className="archive-view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                ☰ List
              </button>
            </div>
          </div>

          <Row className="g-3 align-items-end mb-3">
            <Col md={4}>
              <Form.Control
                type="text"
                placeholder="Search name, ID, position..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                <option>All Departments</option>
                {departmentCounts.map((d, i) => (
                  <option key={i} value={d.name}>{d.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={selectedPosition}
                onChange={e => setSelectedPosition(e.target.value)}
              >
                <option>All Positions</option>
                {[...new Set(employees.map(e => e.position))].filter(Boolean).map((p, i) => (
                  <option key={i} value={p}>{p}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {/* — Divider — */}
          <hr style={{ margin: '0 0 16px', borderColor: '#f0f0f0' }} />

          {/* — Alerts — */}
          {loadError     && <div className="alert alert-danger mb-3">{loadError}</div>}
          {actionMessage && <div className="alert alert-info mb-3">{actionMessage}</div>}

          {/* — Results count — */}
          <div style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 10 }}>
            Showing <strong style={{ color: '#374151' }}>{filteredEmployees.length}</strong> record{filteredEmployees.length !== 1 ? 's' : ''}
          </div>

          {/* — Table — */}
          <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.employee_ID}>
                  <td>{emp.employee_code}</td>
                  <td>{emp.employee_firstName} {emp.employee_LastName}</td>
                  <td>{emp.department_name}</td>
                  <td>{emp.position}</td>
                  <td>
                    <Button
                      className="btn-archive-restore"
                      size="sm"
                      onClick={() => askRestore(emp)}
                    >
                      Restore
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

        </Card.Body>
      </Card>

      {/* ===== RESTORE CONFIRMATION MODAL ===== */}
      <Modal
        show={showConfirmModal}
        onHide={cancelRestore}
        centered
        size="sm"
        backdrop="static"
      >
        <Modal.Header closeButton className="archive-modal-header">
          <Modal.Title style={{ fontSize: 16 }}>Restore Employee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
            Are you sure you want to restore{' '}
            <strong>
              {confirmTarget?.employee_firstName} {confirmTarget?.employee_LastName}
            </strong>{' '}
            to the active employee list?
          </p>
        </Modal.Body>
        <Modal.Footer className="archive-modal-footer">
          <Button className="btn-modal-cancel" onClick={cancelRestore}>
            Cancel
          </Button>
          <Button className="btn-archive-restore" onClick={confirmRestore}>
            Yes, Restore
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}

export default EmployeesArchive;