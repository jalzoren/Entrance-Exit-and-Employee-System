import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { getEventAttendance } from '../api';
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

// ─── Load jsPDF + html2canvas from CDN (once) ───────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

function EventDetailsPage({ onNavigate, eventData }) {

  const [records, setRecords]           = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [exporting, setExporting] = useState(false);

  // ── Logos read from localStorage (managed in Settings) ───────────────────
  const plpLogo         = localStorage.getItem(PLP_LOGO_KEY) || '';
  const institutionName = localStorage.getItem(NAME_KEY) || 'Pamantasan ng Lungsod ng Pasig';
  const deptLogos       = (() => {
    try { return JSON.parse(localStorage.getItem(DEPT_LOGOS_KEY) || '{}'); }
    catch { return {}; }
  })();
  // ─────────────────────────────────────────────────────────────────────────

  const event_ID  = eventData?.event_ID;
  const eventName = eventData?.event_name || 'Event';
  const eventDate = eventData?.event_date || '';
  const eventType = eventData?.eventtype_name || '';
  const location  = eventData?.location_name || '';
  const timeStart = eventData?.event_time || '';
  const timeEnd   = eventData?.time_end   || '';

  useEffect(() => {
    if (event_ID) loadAttendance();
  }, [event_ID]);

  const loadAttendance = async () => {
    const data = await getEventAttendance(event_ID);
    setRecords(data);
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
    const q = searchTerm.toLowerCase();
    const matchSearch = r.fullName.toLowerCase().includes(q) || r.employee_code.toString().includes(q);
    const matchDept   = selectedDept === 'All Departments' || r.department_name === selectedDept;
    return matchSearch && matchDept;
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

      // ── Build the HTML to render ──────────────────────────────────────────
      const rowsHtml = exportRows.map((r, i) => `
        <tr>
          <td class="cc">${i + 1}</td>
          <td>${r.fullName || ''}</td>
          <td class="cc">${r.attended ? '✓' : ''}</td>
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

      const attended    = exportRows.filter(r => r.attended).length;
      const absent      = exportRows.filter(r => !r.attended).length;
      const attendRate  = exportRows.length
        ? ((attended / exportRows.length) * 100).toFixed(1) : 0;

      // Render into a hidden off-screen div
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
          .header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
          .logo-box { width:100px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
          .logo-box img { height:100px; width:100px; object-fit:contain; }
          .logo-placeholder { height:100px; width:100px; border:1.5px dashed #bbb; display:flex;
            align-items:center; justify-content:center; font-size:8pt; color:#aaa;
            text-align:center; line-height:1.4; border-radius:4px; }
          .logo-invisible { height:100px; width:100px; flex-shrink:0; }
          .header-text { flex:1; text-align:center; line-height:1.55; }
          .header-institution { font-size:12.5pt; font-weight:bold; }
          .header-sub { font-size:9.5pt; color:#333; }
          .header-address { font-size:8.5pt; color:#555; margin-top:2px; }
          .divider-top { border-top:2.5px solid #000; margin:10px 0 0; }
          .divider-bottom { border-top:1px solid #000; margin:0 0 10px; }
          .title-block { text-align:center; padding:6px 0 5px; }
          .title-block h2 { font-size:13pt; font-weight:bold; text-transform:uppercase; letter-spacing:1.2px; }
          .title-block .event-name-line { font-size:11.5pt; font-weight:bold; font-style:italic; margin-top:2px; }
          .title-block .date-line { font-size:11pt; margin-top:4px; }
          .info-rows { margin:8px 0 6px; font-size:10.5pt; line-height:1.7; }
          .instruction { font-size:9pt; color:#333; margin-bottom:8px; font-style:italic; }
          table { width:100%; border-collapse:collapse; font-size:10.5pt; margin-bottom:16px; }
          th { background:#f0f0f0; font-weight:700; border:1px solid #000; padding:5px 8px; text-align:center; }
          td { border:1px solid #555; padding:5px 8px; height:26px; vertical-align:middle; }
          .cc { text-align:center; }
          col.col-no { width:42px; }
          col.col-pres { width:80px; }
          col.col-abs { width:100px; }
          .stats-box { display:flex; gap:28px; font-size:10.5pt; border:1px solid #ccc;
            padding:9px 16px; border-radius:4px; background:#fafafa; margin-bottom:22px; }
          .footer-section { margin-top:10px; font-size:10pt; line-height:1.8; }
          .footer-note { margin-bottom:22px; }
          .signature-line { display:inline-block; width:240px; border-top:1.5px solid #000;
            margin-top:32px; padding-top:3px; font-size:10pt; font-weight:bold; }
          .signature-sub { font-size:9.5pt; font-weight:normal; color:#333; }
        </style>

        <div class="header">
          <div class="logo-box">
            ${plpLogo
              ? `<img src="${plpLogo}" alt="PLP Logo" />`
              : `<div class="logo-placeholder">PLP<br>Logo</div>`}
          </div>
          <div class="header-text">
            <div class="header-institution">${institutionName}</div>
            <div class="header-sub">Office of the Human Resource Development</div>
            <div class="header-address">Alkalde Jose St., Kapasigan, Pasig City, Philippines 1600</div>
          </div>
          ${!isAllDepts
            ? `<div class="logo-box">
                ${collegeLogo
                  ? `<img src="${collegeLogo}" alt="College Logo" />`
                  : `<div class="logo-placeholder">College<br>Logo</div>`}
              </div>`
            : `<div class="logo-invisible"></div>`}
        </div>

        <div class="divider-top"></div>
        <div class="title-block">
          <h2>Attendance for ${eventType || 'Event'}</h2>
          <div class="event-name-line">${eventName}</div>
          <div class="date-line">
            DATE: <strong>${dateStr}</strong>
            ${timeStart
              ? ` &nbsp;|&nbsp; TIME: <strong>${formatTime(timeStart)}${timeEnd ? ' – ' + formatTime(timeEnd) : ''}</strong>`
              : ''}
          </div>
        </div>
        <div class="divider-bottom"></div>

        <div class="info-rows">
          <div><strong>NAME OF OFFICE:</strong> ${officeName}</div>
          ${location ? `<div><strong>VENUE:</strong> ${location}</div>` : ''}
        </div>

        <div class="instruction">
          <strong>✓</strong> means present; if absent <strong>A</strong> and if late <strong>L</strong>.
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

      // ── Render to canvas then PDF ─────────────────────────────────────────
      const canvas = await window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      });

      document.body.removeChild(container);

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
        <Button onClick={() => onNavigate('events')}>Back to Events</Button>
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
            <Button onClick={handleExportLog} disabled={exporting}>
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

        </Card.Body>
      </Card>

    </div>
  );
}

export default EventDetailsPage;