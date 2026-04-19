import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { getEventAttendance, getEmployees, getDepartments, getEventSetup, setupEventEmployees, activateEvent, deactivateEvent } from '../api';
import './ccs/event.css';

const PLP_LOGO_KEY   = 'plp_logo';
const DEPT_LOGOS_KEY = 'dept_logos';
const NAME_KEY       = 'institution_name';

function formatTime(val) {
  if (!val || val === '--------') return '';
  try {
    const d = new Date(`1970-01-01T${val}`);
    if (isNaN(d)) return val;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return val; }
}

function formatDate(val) {
  if (!val) return '';
  try {
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d)) return val;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return val; }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensurePdfLibs() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}

function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

function EventDetailsPage({ onNavigate, eventData }) {

  const [records, setRecords]           = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [exporting, setExporting]       = useState(false);
  const [showSetupModal, setShowSetupModal]     = useState(false);
  const [allEmployees, setAllEmployees]         = useState([]);
  const [allDepartments, setAllDepartments]     = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());
  const [setupSearch, setSetupSearch]   = useState('');
  const [savingSetup, setSavingSetup]   = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [eventActive, setEventActive]   = useState((eventData?.is_active ?? 1) === 1);
  const [eventStatus, setEventStatus]   = useState(
    eventData?.status ?? ((eventData?.is_active ?? 1) === 1 ? 'Activated' : 'Deactivated')
  );
  const [hasSetup, setHasSetup] = useState(false);

  const plpLogo         = localStorage.getItem(PLP_LOGO_KEY) || '';
  const institutionName = localStorage.getItem(NAME_KEY) || 'Pamantasan ng Lungsod ng Pasig';
  const deptLogos       = (() => {
    try { return JSON.parse(localStorage.getItem(DEPT_LOGOS_KEY) || '{}'); }
    catch { return {}; }
  })();

  const event_ID  = eventData?.event_ID;
  const eventName = eventData?.event_name || 'Event';
  const eventDate = eventData?.event_date || '';
  const eventType = eventData?.eventtype_name || '';
  const location  = eventData?.location_name || '';
  const timeStart = eventData?.event_time || '';
  const timeEnd   = eventData?.time_end   || '';

  useEffect(() => {
    if (!event_ID) return;
    (async () => {
      const setupExists = await loadSetupData();
      if (setupExists) {
        await loadAttendance();
      } else {
        setRecords([]);
      }
    })();
  }, [event_ID]);

  // Safety cleanup for modal backdrop
  useEffect(() => {
  if (showSetupModal) return;
  // Use a small delay so React finishes its own DOM cleanup first
  const timer = setTimeout(() => {
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    const staleBackdrops = document.querySelectorAll('.modal-backdrop');
    staleBackdrops.forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }, 300);
  return () => clearTimeout(timer);
}, [showSetupModal]);

  const loadAttendance = async () => {
    const data = await getEventAttendance(event_ID);
    setRecords(data);
  };

  const loadSetupData = async () => {
    try {
      const [employeesData, departmentsData, setupData] = await Promise.all([
        getEmployees(),
        getDepartments(),
        getEventSetup(event_ID),
      ]);

      const empArr  = Array.isArray(employeesData)   ? employeesData   : (employeesData?.data   ?? []);
      const deptArr = Array.isArray(departmentsData) ? departmentsData : (departmentsData?.data ?? []);
      const activeEmployees = empArr.filter(e => e.is_archived !== 1);
      const ids = Array.isArray(setupData?.employee_ids) ? setupData.employee_ids : [];

      setAllEmployees(activeEmployees);
      setAllDepartments(deptArr);
      setSelectedEmployeeIds(new Set(ids.map(Number)));
      const setupExists = Array.isArray(ids) && ids.length > 0;
      setHasSetup(setupExists);
      // Prefer explicit `status` when provided by the API; fallback to is_active
      if (setupData && (setupData?.status ?? null) !== null) {
        setEventStatus(setupData.status);
        setEventActive((setupData.status === 'Activated'));
      } else {
        const isActiveVal = (setupData?.is_active ?? eventData?.is_active ?? 1) === 1;
        setEventActive(isActiveVal);
        setEventStatus(eventData?.status ?? (isActiveVal ? 'Activated' : 'Deactivated'));
      }
      return setupExists;
    } catch (e) {
      console.error('Failed to load event setup data', e);
      setHasSetup(false);
    }
  };

  const handleDepartmentToggle = (departmentId, checked) => {
    const next = new Set(selectedEmployeeIds);
    allEmployees
      .filter(emp => Number(emp.department_ID) === Number(departmentId))
      .forEach(emp => {
        if (checked) next.add(Number(emp.employee_ID));
        else next.delete(Number(emp.employee_ID));
      });
    setSelectedEmployeeIds(next);
  };

  const handleEmployeeToggle = (employeeId, checked) => {
    const next = new Set(selectedEmployeeIds);
    if (checked) next.add(Number(employeeId));
    else next.delete(Number(employeeId));
    setSelectedEmployeeIds(next);
  };

  const saveSetup = async () => {
    try {
      setSavingSetup(true);
      await setupEventEmployees(event_ID, Array.from(selectedEmployeeIds));
      // Refresh setup info so `hasSetup` and button state update immediately
      await loadSetupData();
      setShowSetupModal(false);
      await loadAttendance();
    } catch (e) {
      alert(e?.message || 'Failed to save event setup.');
    } finally {
      setSavingSetup(false);
    }
  };

  const handleActivate = async () => {
    if (!hasSetup) {
      alert('Please set up event first');
      return;
    }

    try {
      setUpdatingStatus(true);
      await activateEvent(event_ID);
      setEventActive(true);
      setEventStatus('Activated');
      await loadSetupData();
    } catch (e) {
      alert(e?.message || 'Failed to activate event.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setUpdatingStatus(true);
      await deactivateEvent(event_ID);
      setEventActive(false);
      setEventStatus('Deactivated');
      await loadSetupData();
    } catch (e) {
      alert(e?.message || 'Failed to deactivate event.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totalAttended = records.filter(r => r.attended).length;
  const totalMissed   = records.filter(r => !r.attended).length;
  const rate          = records.length
    ? ((totalAttended / records.length) * 100).toFixed(1)
    : 0;

  const departments = [
    'All Departments',
    ...new Set(records.map(r => r.department_name)),
  ];

  const filtered = records.filter(r => {
    const q           = searchTerm.toLowerCase();
    const matchSearch = r.fullName.toLowerCase().includes(q) || r.employee_code.toString().includes(q);
    const matchDept   = selectedDept === 'All Departments' || r.department_name === selectedDept;
    return matchSearch && matchDept;
  });

  const setupFilteredEmployees = allEmployees.filter(emp => {
    const q        = setupSearch.toLowerCase();
    const fullName = `${emp.employee_firstName || ''} ${emp.employee_LastName || ''}`.trim().toLowerCase();
    const code     = String(emp.employee_code || '').toLowerCase();
    return fullName.includes(q) || code.includes(q);
  });

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handleExportLog = async () => {
    setExporting(true);
    try {
      await ensurePdfLibs();

      const isAllDepts  = selectedDept === 'All Departments';
      const officeName  = isAllDepts ? 'ALL DEPARTMENTS' : selectedDept.toUpperCase();
      const collegeLogo = isAllDepts ? '' : (deptLogos[selectedDept] || '');
      const exportRows  = filtered;
      const dateStr     = formatDate(eventDate);

      // Pre-load logos as base64
      const [pasigLogoB64, pasigWordmarkB64, plpLogoB64, collegeLogoB64] = await Promise.all([
        loadImageAsBase64('/Pasig_Logo.PNG'),
        loadImageAsBase64('/Pasig_Wordmark.PNG'),
        plpLogo ? loadImageAsBase64(plpLogo) : Promise.resolve(''),
        collegeLogo ? loadImageAsBase64(collegeLogo) : Promise.resolve(''),
      ]);

      const rowsHtml = exportRows.map((r, i) => `
        <tr>
          <td class="cc">${i + 1}</td>
          <td>${r.fullName || ''}</td>
          <td class="cc">${r.attended ? '&#10003;' : ''}</td>
          <td class="cc">${!r.attended ? 'A' : ''}</td>
        </tr>
      `).join('');

      const padCount    = Math.max(0, 15 - exportRows.length);
      const paddingHtml = Array.from({ length: padCount }).map((_, i) => `
        <tr>
          <td class="cc">${exportRows.length + i + 1}</td>
          <td></td><td></td><td></td>
        </tr>
      `).join('');

      const attended   = exportRows.filter(r => r.attended).length;
      const absent     = exportRows.filter(r => !r.attended).length;
      const attendRate = exportRows.length
        ? ((attended / exportRows.length) * 100).toFixed(1) : 0;

      const container = document.createElement('div');
      container.style.cssText = `
        position:fixed; left:-9999px; top:0;
        width:794px; background:#fff; padding:28px 40px;
        font-family:Arial,Helvetica,sans-serif; font-size:11pt; color:#000;
        box-sizing:border-box;
      `;

      container.innerHTML = `
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 14px;
          }

          /* LEFT: logos row */
          .logo-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }
          .logo-left img {
            height: 75px;
            width: auto;
            object-fit: contain;
          }
          .logo-wordmark { height: 48px !important; }
          .logo-divider {
            width: 1.5px;
            height: 65px;
            background: #cccccc;
            flex-shrink: 0;
            margin: 0 4px;
          }
          .logo-placeholder {
            height: 75px;
            width: 75px;
            border: 1.5px dashed #bbb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8pt;
            color: #aaa;
            text-align: center;
            line-height: 1.4;
            border-radius: 4px;
          }

          /* RIGHT: school info */
          .header-right {
            text-align: right;
            line-height: 1.6;
            flex-shrink: 0;
            max-width: 320px;
          }
          .header-institution {
            font-size: 12pt;
            font-weight: bold;
            color: #ffffff;
            background-color: #003399;
            padding: 2px 6px 2px 12px;
            letter-spacing: 0.3px;
            display: inline-block;
            border-radius: 20px 0px 0px 20px;
          }
          .header-sub {
            font-size: 9.5pt;
            color: #222;
            font-weight: 600;
            margin-top: 3px;
          }
          .header-address {
            font-size: 8.5pt;
            color: #444;
            margin-top: 1px;
          }
          .header-contact {
            font-size: 8pt;
            color: #555;
            margin-top: 2px;
          }

          /* TITLE BLOCK */
          .title-block {
            text-align: center;
            padding: 8px 0 6px;
          }
          .title-block h2 {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.2px;
          }
          .title-block .date-line {
            font-size: 11pt;
            margin-top: 4px;
          }

          .info-rows { margin: 10px 0 6px; font-size: 10.5pt; line-height: 1.7; }
          .instruction { font-size: 9pt; color: #333; margin-bottom: 8px; font-style: italic; }

          table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 16px; }
          th {
            background: #f0f0f0; font-weight: 700;
            border: 1px solid #000; padding: 5px 8px; text-align: center;
          }
          td { border: 1px solid #555; padding: 5px 8px; height: 26px; vertical-align: middle; }
          .cc { text-align: center; }
          col.col-no   { width: 42px; }
          col.col-pres { width: 80px; }
          col.col-abs  { width: 100px; }

          .stats-box {
            display: flex; gap: 28px; font-size: 10.5pt;
            border: 1px solid #ccc; padding: 9px 16px;
            border-radius: 4px; background: #fafafa; margin-bottom: 22px;
          }
          .footer-section { margin-top: 10px; font-size: 10pt; line-height: 1.8; }
          .footer-note    { margin-bottom: 22px; }
          .signature-line {
            display: inline-block; width: 240px;
            border-top: 1.5px solid #000;
            margin-top: 32px; padding-top: 3px;
            font-size: 10pt; font-weight: bold;
          }
          .signature-sub { font-size: 9.5pt; font-weight: normal; color: #333; }
        </style>

        <!-- HEADER -->
        <div class="header">

          <!-- LEFT: Pasig Logo → Pasig Wordmark → divider → School Logo → Dept Logo -->
          <div class="logo-left">
            ${pasigLogoB64
              ? `<img src="${pasigLogoB64}" alt="Pasig Logo" />`
              : `<div class="logo-placeholder">Pasig<br>Logo</div>`}

            ${pasigWordmarkB64
              ? `<img src="${pasigWordmarkB64}" alt="Pasig Wordmark" class="logo-wordmark" />`
              : `<div class="logo-placeholder" style="width:110px;">Pasig<br>Wordmark</div>`}

            <div class="logo-divider"></div>

            ${plpLogoB64
              ? `<img src="${plpLogoB64}" alt="School Logo" />`
              : `<div class="logo-placeholder">School<br>Logo</div>`}

            ${!isAllDepts
              ? collegeLogoB64
                ? `<img src="${collegeLogoB64}" alt="Department Logo" />`
                : `<div class="logo-placeholder">Dept<br>Logo</div>`
              : ''}
          </div>

          <!-- RIGHT: school name ribbon + info -->
          <div class="header-right">
            <div class="header-institution">${institutionName}</div>
            <div class="header-sub">Office of the Human Resource Development</div>
            <div class="header-address">Alkalde Jose St., Kapasigan, Pasig City, Philippines 1600</div>
            <div class="header-contact">&#9990; 638-1014 Loc. 106 &nbsp;&nbsp;|&nbsp;&nbsp; &#9993; hrd@plpasig.edu.ph</div>
          </div>

        </div>

        <!-- TITLE BLOCK -->
        <div class="title-block">
          <h2>Attendance for ${eventType || 'Event'}</h2>
          <div class="date-line">
            DATE: <strong>${dateStr}</strong>
            ${timeStart
              ? ` &nbsp;|&nbsp; TIME: <strong>${formatTime(timeStart)}${timeEnd ? ' \u2013 ' + formatTime(timeEnd) : ''}</strong>`
              : ''}
          </div>
        </div>

        <div class="info-rows">
          <div><strong>NAME OF OFFICE:</strong> ${officeName}</div>
          ${location ? `<div><strong>VENUE:</strong> ${location}</div>` : ''}
        </div>

        <div class="instruction">
          <strong>&#10003;</strong> means present; if absent <strong>A</strong> and if late <strong>L</strong>.
        </div>

        <table>
          <colgroup>
            <col class="col-no" /><col /><col class="col-pres" /><col class="col-abs" />
          </colgroup>
          <thead>
            <tr>
              <th>No.</th>
              <th>Name of Employee</th>
              <th>PRESENT</th>
              <th>ABSENT / LATE</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            ${paddingHtml}
          </tbody>
        </table>

        <div class="stats-box">
          <span>Total Employees: <strong>${exportRows.length}</strong></span>
          <span>Attended: <strong>${attended}</strong></span>
          <span>Absent / Late: <strong>${absent}</strong></span>
          <span>Attendance Rate: <strong>${attendRate}%</strong></span>
        </div>

        <div class="footer-section">
          <div class="footer-note">
            Recorded by HRD Personnel<br/>
            Attendance checked/monitored by:
          </div>
          <div class="signature-line">
            Signature Over Printed Name<br/>
            <span class="signature-sub">Head of Office</span>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await window.html2canvas(container, {
        scale:           2,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#ffffff',
        width:           794,
        windowWidth:     794,
      });

      // Safe removal — check it's still in the DOM
      if (container.parentNode === document.body) {
        document.body.removeChild(container);
      }

      const { jsPDF } = window.jspdf;
      const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW     = pdf.internal.pageSize.getWidth();
      const pageH     = pdf.internal.pageSize.getHeight();
      const imgData   = canvas.toDataURL('image/jpeg', 0.95);
      const imgW      = pageW;
      const imgH      = (canvas.height / canvas.width) * imgW;

      let yPos = 0;
      while (yPos < imgH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yPos, imgW, imgH);
        yPos += pageH;
      }

      pdf.save(`${eventName.replace(/\s+/g, '_')}_Attendance.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page">

      <div className="page-header-section">
        <h1 className="page-title">Event Details ({eventName})</h1>
        <div className="d-flex align-items-center gap-2">
            {(() => {
              const variant = eventStatus === 'Activated' ? 'success' : (eventStatus === 'Completed' ? 'info' : 'secondary');
              return <Badge bg={variant}>{eventStatus || 'Unknown'}</Badge>;
            })()}
          <Button onClick={() => onNavigate('events')}>Back to Events</Button>
        </div>
      </div>

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

      <Card className="content-card">
        <Card.Body>

          <div className="card-header-section">
            <div>
              <h5>Attendance Records</h5>
            </div>
            <Button onClick={handleExportLog} disabled={exporting || !hasSetup}>
              {exporting ? 'Exporting…' : 'Export PDF'}
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
                      <td>{r.status || '--------'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            Showing {filtered.length} of {records.length} employees
          </div>

          <div className="mt-3 d-flex justify-content-end gap-2">
            <Button variant="outline-primary" onClick={() => setShowSetupModal(true)}>
              Setup Event
            </Button>
            {eventActive ? (
              <Button variant="outline-danger" onClick={handleDeactivate} disabled={updatingStatus}>
                {updatingStatus ? 'Updating...' : 'Deactivate'}
              </Button>
            ) : (
              <Button variant="success" onClick={handleActivate} disabled={updatingStatus || !hasSetup}>
                {updatingStatus ? 'Updating...' : 'Activate'}
              </Button>
            )}
          </div>

        </Card.Body>
      </Card>

      <Modal show={showSetupModal} onHide={() => setShowSetupModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Setup Event Employees</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            className="mb-3"
            type="text"
            placeholder="Search employee number or name..."
            value={setupSearch}
            onChange={(e) => setSetupSearch(e.target.value)}
          />

          <div className="mb-3">
            <strong>Departments</strong>
            <div className="d-flex flex-wrap gap-3 mt-2">
              {allDepartments.map((dept) => {
                const deptEmployees = allEmployees.filter(
                  emp => Number(emp.department_ID) === Number(dept.department_ID)
                );
                const allSelected = deptEmployees.length > 0 &&
                  deptEmployees.every(emp => selectedEmployeeIds.has(Number(emp.employee_ID)));
                return (
                  <Form.Check
                    key={dept.department_ID}
                    type="checkbox"
                    label={dept.department_name}
                    checked={allSelected}
                    onChange={(e) => handleDepartmentToggle(dept.department_ID, e.target.checked)}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            {setupFilteredEmployees.map((emp) => {
              const employeeId = Number(emp.employee_ID);
              return (
                <Form.Check
                  key={employeeId}
                  type="checkbox"
                  className="mb-2"
                  label={`${emp.employee_code} - ${emp.employee_firstName} ${emp.employee_LastName}`}
                  checked={selectedEmployeeIds.has(employeeId)}
                  onChange={(e) => handleEmployeeToggle(employeeId, e.target.checked)}
                />
              );
            })}
            {setupFilteredEmployees.length === 0 && <div>No employees found.</div>}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSetupModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveSetup} disabled={savingSetup}>
            {savingSetup ? 'Saving...' : 'Complete'}
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}

export default EventDetailsPage;