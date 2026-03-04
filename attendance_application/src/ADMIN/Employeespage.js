import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Modal } from 'react-bootstrap';
import { getEmployees, addEmployee, deleteEmployee, getDepartments, getPositions, getEmailsList } from '../api';
import './ccs/employee.css';

function EmployeesPage() {

  // ===============================
  // STATE
  // ===============================

  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [emails, setEmails] = useState([]);

  const [newEmployee, setNewEmployee] = useState({
    employee_code: '',
    employee_firstName: '',
    employee_LastName: '',
    department_ID: '',
    position_ID: '',
    email_ID: ''
  });

  // ===============================
  // LOAD DATA FROM DATABASE
  // ===============================

  useEffect(() => {
    loadEmployees();
    loadMeta();
  }, []);

  const loadEmployees = async () => {
    const data = await getEmployees();
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    setEmployees(list);
  };

  const loadMeta = async () => {
    try {
      const [d, p, e] = await Promise.all([
        getDepartments(),
        getPositions(),
        getEmailsList()
      ]);
      setDepartments(Array.isArray(d) ? d : (d?.data ?? []));
      setPositions(Array.isArray(p) ? p : (p?.data ?? []));
      setEmails(Array.isArray(e) ? e : (e?.data ?? []));
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  // ===============================
  // FILTER LOGIC
  // ===============================

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.employee_firstName} ${emp.employee_LastName}`;
    const q = searchTerm.toLowerCase();

    const matchSearch =
      fullName.toLowerCase().includes(q) ||
      String(emp.employee_code).includes(q) ||
      emp.position.toLowerCase().includes(q);

    const matchDept =
      selectedDepartment === 'All Departments' ||
      emp.department_name === selectedDepartment;

    return matchSearch && matchDept;
  });

  // ===============================
  // DYNAMIC DEPARTMENT COUNTS
  // ===============================

  const departmentCounts = employees.reduce((acc, emp) => {
    const found = acc.find(d => d.name === emp.department_name);
    if (found) {
      found.count += 1;
    } else {
      acc.push({ name: emp.department_name, count: 1 });
    }
    return acc;
  }, []);

  // ===============================
  // DELETE EMPLOYEE
  // ===============================

  const handleDelete = async (id) => {
    if (window.confirm("Delete this employee?")) {
      await deleteEmployee(id);
      loadEmployees();
    }
  };

  // ===============================
  // ADD EMPLOYEE
  // ===============================

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    try {
      setSaving(true);
      const res = await addEmployee({
        employee_code: newEmployee.employee_code,
        employee_firstName: newEmployee.employee_firstName,
        employee_LastName: newEmployee.employee_LastName,
        department_ID: newEmployee.department_ID || null,
        position_ID: newEmployee.position_ID || null,
        email_ID: newEmployee.email_ID || null
      });
      setShowAddModal(false);
      setNewEmployee({
        employee_code: '',
        employee_firstName: '',
        employee_LastName: '',
        department_ID: '',
        position_ID: '',
        email_ID: ''
      });
      await loadEmployees();
      setAddSuccess(res?.message || 'Employee added successfully');
      setTimeout(() => setAddSuccess(''), 4000);
    } catch (err) {
      setAddError(err?.message || 'Failed to add employee. Please check "employee.php".');
      setTimeout(() => setAddError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // UI
  // ===============================

  return (
    <div className="admin-page">

      {/* HEADER */}
      <div className="page-header-section">
        <h1 className="page-title">Employee Management</h1>
        <Button onClick={() => setShowAddModal(true)}>
          Add Employee
        </Button>
      </div>

      <Card className="content-card">
        <Card.Body>

          {addSuccess && (
            <div className="alert alert-success mb-3" role="alert">
              {addSuccess}
            </div>
          )}
          {addError && (
            <div className="alert alert-danger mb-3" role="alert">
              {addError}
            </div>
          )}

          {/* SEARCH */}
          <Row className="mb-3">
            <Col md={8}>
              <Form.Control
                type="text"
                placeholder="Search name, ID, position..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                <option value="All Departments">All Departments</option>
                {departmentCounts.map((dept, i) => (
                  <option key={i} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {/* DEPARTMENT BADGES */}
          <div className="mb-3">
            {departmentCounts.map((dept, i) => (
              <span key={i} style={{ marginRight: 10 }}>
                {dept.name} ({dept.count})
              </span>
            ))}
          </div>

          {/* TABLE */}
          <Table striped bordered hover>
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
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(emp => (
                  <tr key={emp.employee_ID}>
                    <td>{emp.employee_code}</td>
                    <td>{emp.employee_firstName} {emp.employee_LastName}</td>
                    <td>{emp.department_name}</td>
                    <td>{emp.position}</td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(emp.employee_ID)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

        </Card.Body>
      </Card>

      {/* ADD MODAL */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Employee</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmitAdd}>
            <Form.Group className="mb-3">
              <Form.Label>Employee Code</Form.Label>
              <Form.Control
                required
                value={newEmployee.employee_code}
                onChange={e => setNewEmployee({
                  ...newEmployee,
                  employee_code: e.target.value
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                required
                value={newEmployee.employee_firstName}
                onChange={e => setNewEmployee({
                  ...newEmployee,
                  employee_firstName: e.target.value
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                required
                value={newEmployee.employee_LastName}
                onChange={e => setNewEmployee({
                  ...newEmployee,
                  employee_LastName: e.target.value
                })}
              />
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Department</Form.Label>
                <Form.Select
                  required
                  value={newEmployee.department_ID}
                  onChange={e => setNewEmployee({ ...newEmployee, department_ID: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.department_ID} value={d.department_ID}>{d.department_name}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Position</Form.Label>
                <Form.Select
                  required
                  value={newEmployee.position_ID}
                  onChange={e => setNewEmployee({ ...newEmployee, position_ID: e.target.value })}
                >
                  <option value="">Select Position</option>
                  {positions.map(p => (
                    <option key={p.position_ID} value={p.position_ID}>{p.position_name}</option>
                  ))}
                </Form.Select>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Select
                value={newEmployee.email_ID}
                onChange={e => setNewEmployee({ ...newEmployee, email_ID: e.target.value })}
              >
                <option value="">Select Email (optional)</option>
                {emails.map(em => (
                  <option key={em.email_ID} value={em.email_ID}>{em.email}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default EmployeesPage;
