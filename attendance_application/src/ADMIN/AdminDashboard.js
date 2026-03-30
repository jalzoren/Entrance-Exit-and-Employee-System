import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import EmployeesPage from './Employeespage';
import EventsPage from './Eventspage';
import EventDetailsPage from './Eventdetailspage';
import EntryExitPage from './Entryexitpage';
import Settingspage from './Settingspage';
import Eventsarchives from './Eventsarchives';
import EmployeesArchive from './Employeesarchives';
import { getDashboardStats, getDepartmentAttendance } from '../api';
import './ccs/dashboard.css';
import LiveClock from "../components/LiveClock";
import InfoTooltip from "../components/InfoTooltip";

// ── Keys shared with Settingspage ──────────────────────────────────────────
const LOGO_KEY = 'institution_logo';
const NAME_KEY = 'institution_name';

function AdminDashboard({ onLogout }) {

  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState({ page: 'dashboard', data: null });
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const [archivesDropdownOpen, setArchivesDropdownOpen] = useState(false);

  // ── Branding (logo + name) ─────────────────────────────────────────────
  const [sidebarLogo, setSidebarLogo] = useState(() => localStorage.getItem(LOGO_KEY) || null);
  const [sidebarName, setSidebarName] = useState(() => localStorage.getItem(NAME_KEY) || 'INSTITUTIONAL ADMIN SUPPORT');

  // Called by Settingspage when user clicks Save
  const handleBrandingChange = ({ logo, name }) => {
    if (logo) setSidebarLogo(logo);
    if (name) setSidebarName(name);
  };

  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent:  0,
    totalLate:    0,
    todayEntries: 0,
    todayExits:   0,
  });

  const [departmentData, setDepartmentData] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { loadDashboardData(); }, []);

  // Re-fetch whenever the user navigates back to the dashboard
  useEffect(() => {
    if (currentPage.page === 'dashboard') loadDashboardData();
  }, [currentPage.page]);

  const loadDashboardData = async () => {
    try {
      const statsData = await getDashboardStats();
      const deptData  = await getDepartmentAttendance();
      setStats(statsData ?? { totalPresent:0, totalAbsent:0, totalLate:0, todayEntries:0, todayExits:0 });
      setDepartmentData(Array.isArray(deptData) ? deptData : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const total          = stats.totalPresent + stats.totalAbsent + stats.totalLate;
  const presentPercent = total ? (stats.totalPresent / total) * 100 : 0;
  const latePercent    = total ? (stats.totalLate    / total) * 100 : 0;
  const absentPercent  = total ? (stats.totalAbsent  / total) * 100 : 0;

  const formatTime = (date) =>
    date.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  const navigateToPage = (pageName, data = null) => {
    setEventsDropdownOpen(false);
    setArchivesDropdownOpen(false);

    const eventsPages  = ['events', 'eventDetails'];
    const archivePages = ['archiveEmployees', 'archiveEvents'];
    let menu = pageName;
    if (eventsPages.includes(pageName))  menu = 'events';
    else if (archivePages.includes(pageName)) menu = 'archive';
    setActiveMenu(menu);
    setCurrentPage({ page: pageName, data });
  };

  // ── SVG Donut ──────────────────────────────────────────────────────────────
  const SvgDonut = () => {
    const size = 260;
    const cx = size / 2, cy = size / 2;
    const r = 95, strokeW = 50;
    const circ = 2 * Math.PI * r;
    const slices = [
      { pct: presentPercent, color: '#28a745' },
      { pct: latePercent,    color: '#ffc107' },
      { pct: absentPercent,  color: '#dc3545' },
    ];
    let cumulative = 0;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={strokeW} />
        {slices.map((s, i) => {
          const dash   = (s.pct / 100) * circ;
          const gap    = circ - dash;
          const offset = circ * 0.25 - (cumulative / 100) * circ;
          cumulative += s.pct;
          if (s.pct === 0) return null;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeW}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize="36" fontWeight="800" fill="#222">{total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="14" fill="#aaa">Total</text>
      </svg>
    );
  };

  // ── Dept Bars ──────────────────────────────────────────────────────────────
  const maxDeptTotal = Math.max(...departmentData.map(d => (d.present || 0) + (d.absent || 0)), 1);

  const renderDashboard = () => (
    <div className="dashboard-container">
      <h1 className="dashboard-title mb-4">Dashboard Overview</h1>

      {/* ── STAT CARDS ── */}
      <Row className="g-4 mb-4">
        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">
                Present Today
                <InfoTooltip text="Number of employees marked present today" />
              </p>
              <h2 className="stat-value text-success">{stats.totalPresent}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">
                Late Today
                <InfoTooltip text="Number of employees who were late today" />
              </p>
              <h2 className="stat-value text-warning">{stats.totalLate}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">
                Absent Today
                <InfoTooltip text="Number of employees absent today" />
              </p>
              <h2 className="stat-value text-danger">{stats.totalAbsent}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">
                Total Employees
                <InfoTooltip text="Total number of employees in the system" />
              </p>
              <h2 className="stat-value">{total}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── ENTRY / EXIT ── */}
      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="gateway-card">
            <Card.Body>
              <h5>
                Today's Entries
                <InfoTooltip text="Number of employees who entered today" />
              </h5>
              <h2>{stats.todayEntries}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="gateway-card">
            <Card.Body>
              <h5>
                Today's Exits
                <InfoTooltip text="Number of employees who exited today" />
              </h5>
              <h2>{stats.todayExits}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── CHARTS ── */}
      <Row className="g-4">

        {/* PIE */}
        <Col lg={6}>
          <Card className="analytics-card">
            <Card.Body>
              <h6 style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>
                Overall Status Distribution
                <InfoTooltip text="Shows the percentage of employees Present, Late, and Absent today" />
              </h6>
              <p style={{ fontSize:12, color:'#aaa', marginBottom:20 }}>
                Total attendance status breakdown
              </p>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:36 }}>
                <SvgDonut />
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  {[
                    { label:'Present', value:stats.totalPresent, pct:presentPercent, color:'#28a745' },
                    { label:'Late',    value:stats.totalLate,    pct:latePercent,    color:'#ffc107' },
                    { label:'Absent',  value:stats.totalAbsent,  pct:absentPercent,  color:'#dc3545' },
                  ].map((d, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ width:14, height:14, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                      <span style={{ fontSize:15, color:'#444' }}>
                        {d.label}: <strong style={{ color:'#222' }}>{d.value}</strong>{' '}
                        <span style={{ color:'#999', fontSize:13 }}>({d.pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* DEPT BARS */}
        <Col lg={6}>
          <Card className="analytics-card">
            <Card.Body>
              <h6 style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>
                Department-wise Attendance
                <InfoTooltip text="Shows attendance for each department with Present and Absent counts" />
              </h6>
              <p style={{ fontSize:12, color:'#aaa', marginBottom:16 }}>
                Attendance breakdown by department
              </p>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {departmentData.map((dept, i) => {
                  const present = dept.present || 0;
                  const absent  = dept.absent  || 0;
                  const BAR_BASE_WIDTH = 220;
                  const presentPx = Math.round((present / maxDeptTotal) * BAR_BASE_WIDTH);
                  const absentPx  = Math.round((absent  / maxDeptTotal) * BAR_BASE_WIDTH);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:15, color:'#555', fontWeight:500, width:150, textAlign:'left', flexShrink:0, lineHeight:1.2 }}>
                        {dept.department_name}
                      </span>
                      <div style={{ display:'flex', gap:2, alignItems:'center', flexGrow:1 }}>
                        {present > 0 && (
                          <div style={{
                            width: Math.max(presentPx, 20), height:24,
                            background:'#28a745',
                            borderRadius: absent === 0 ? 4 : '4px 0 0 4px',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#fff', fontSize:11, fontWeight:700,
                            minWidth: 'fit-content', padding: '0 5px'
                          }}>
                            {present}
                          </div>
                        )}
                        {absent > 0 && (
                          <div style={{
                            width: Math.max(absentPx, 20), height:24,
                            background:'#dc3545',
                            borderRadius: present === 0 ? 4 : '0 4px 4px 0',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#fff', fontSize:11, fontWeight:700,
                            minWidth: 'fit-content', padding: '0 5px'
                          }}>
                            {absent}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:20, marginTop:16, paddingTop:12, borderTop:'1px solid #f0f0f0' }}>
                {[['#28a745','Present'],['#dc3545','Absent']].map(([color, label]) => (
                  <span key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#555' }}>
                    <span style={{ width:12, height:12, borderRadius:2, background:color, display:'inline-block' }} />
                    {label}
                  </span>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">

          {/* ── Logo: shows uploaded image or fallback building icon ── */}
          <div className="sidebar-logo-circle" style={{ overflow: 'hidden', padding: sidebarLogo ? 0 : undefined }}>
            {sidebarLogo ? (
              <img
                src={sidebarLogo}
                alt="Institution logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
              />
            ) : (
              <i className="bi bi-building" style={{ fontSize:'28px', color:'white' }}></i>
            )}
          </div>

          {/* ── Name: shows saved institution name ── */}
          <div className="sidebar-title">
            <h5>{sidebarName}</h5>
          </div>

        </div>

        <nav className="sidebar-nav">

          {/* Dashboard */}
          <div
            className={`nav-item ${activeMenu==='dashboard' ? 'active' : ''}`}
            onClick={() => navigateToPage('dashboard')}
          >
            <i className="bi bi-grid-3x3-gap-fill"></i><span>Dashboard</span>
          </div>

          {/* Employees */}
          <div
            className={`nav-item ${activeMenu==='employees' ? 'active' : ''}`}
            onClick={() => navigateToPage('employees')}
          >
            <i className="bi bi-people-fill"></i><span>Employees</span>
          </div>

          {/* Events — dropdown */}
          <div
            className={`nav-item nav-item-dropdown ${activeMenu==='events' ? 'active' : ''}`}
            onClick={() => navigateToPage('events')}
            onMouseEnter={() => setEventsDropdownOpen(true)}
            onMouseLeave={() => setEventsDropdownOpen(false)}
          >
            <i className="bi bi-calendar-event-fill"></i>
            <span>Events</span>
            <i className={`bi bi-chevron-${eventsDropdownOpen ? 'up' : 'down'} ms-auto`}></i>

            {eventsDropdownOpen && (
              <div className="dropdown-menu-custom">
                <div
                  className={`dropdown-item-custom ${currentPage.page==='events' ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); navigateToPage('events'); }}
                >
                  <i className="bi bi-list-task me-2"></i>
                  <span>Events Overview</span>
                </div>
                <div
                  className={`dropdown-item-custom ${currentPage.page==='eventDetails' ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); navigateToPage('events'); }}
                >
                  <i className="bi bi-people-fill me-2"></i>
                  <span>Event Attendance</span>
                </div>
              </div>
            )}
          </div>

          {/* Archives — dropdown */}
          <div
            className={`nav-item nav-item-dropdown ${activeMenu==='archive' ? 'active' : ''}`}
            onClick={() => navigateToPage('archiveEvents')}
            onMouseEnter={() => setArchivesDropdownOpen(true)}
            onMouseLeave={() => setArchivesDropdownOpen(false)}
          >
            <i className="bi bi-archive-fill"></i>
            <span>Archives</span>
            <i className={`bi bi-chevron-${archivesDropdownOpen ? 'up' : 'down'} ms-auto`}></i>

            {archivesDropdownOpen && (
              <div className="dropdown-menu-custom">
                <div
                  className={`dropdown-item-custom ${currentPage.page==='archiveEmployees' ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); navigateToPage('archiveEmployees'); }}
                >
                  <i className="bi bi-person-lines-fill me-2"></i>
                  <span>Employees</span>
                </div>
                <div
                  className={`dropdown-item-custom ${currentPage.page==='archiveEvents' ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); navigateToPage('archiveEvents'); }}
                >
                  <i className="bi bi-calendar-event-fill me-2"></i>
                  <span>Events</span>
                </div>
              </div>
            )}
          </div>

          {/* Entry / Exit */}
          <div
            className={`nav-item ${activeMenu==='entryExit' ? 'active' : ''}`}
            onClick={() => navigateToPage('entryExit')}
          >
            <i className="bi bi-box-arrow-right"></i><span>Entry/Exit</span>
          </div>

          {/* Settings */}
          <div
            className={`nav-item ${activeMenu==='settings' ? 'active' : ''}`}
            onClick={() => navigateToPage('settings')}
          >
            <i className="bi bi-gear-fill"></i><span>Settings</span>
          </div>

        </nav>

        <div className="sidebar-footer">
          <button className="sign-out-btn" onClick={onLogout}>
            <i className="bi bi-box-arrow-right"></i><span>SIGN OUT</span>
          </button>
        </div>
      </aside>

      <div className="main-content-area">
        <div className="status-bar">
          <span className="status-badge">Live Status</span>
          <LiveClock className="status-clock" />
        </div>
        <div className="content-overlay">
          {currentPage.page==='dashboard'        && renderDashboard()}
          {currentPage.page==='employees'        && <EmployeesPage />}
          {currentPage.page==='events'           && <EventsPage onNavigate={(page, data) => navigateToPage(page, data)} />}
          {currentPage.page==='eventDetails'     && <EventDetailsPage eventData={currentPage.data} onNavigate={page => navigateToPage(page)} />}
          {currentPage.page==='entryExit'        && <EntryExitPage />}
          {currentPage.page==='settings'         && (
            <Settingspage onBrandingChange={handleBrandingChange} />
          )}
          {currentPage.page==='archiveEvents'    && <Eventsarchives onNavigate={(page, data) => navigateToPage(page, data)} />}
          {currentPage.page==='archiveEmployees' && <EmployeesArchive onNavigate={(page, data) => navigateToPage(page, data)} />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;