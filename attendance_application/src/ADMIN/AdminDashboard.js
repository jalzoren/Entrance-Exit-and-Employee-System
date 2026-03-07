import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import EmployeesPage from './Employeespage';
import EventsPage from './Eventspage';
import EventDetailsPage from './Eventdetailspage';
import EntryExitPage from './Entryexitpage';
import Settingspage from './Settingspage';
import { getDashboardStats, getDepartmentAttendance } from '../api';
import './ccs/dashboard.css';
import LiveClock from "../components/LiveClock";
import InfoTooltip from "../components/InfoTooltip";

function AdminDashboard({ onLogout }) {

  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState({ page: 'dashboard', data: null });
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);

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
    setActiveMenu(pageName === 'eventDetails' ? 'events' : pageName);
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
        {/* Background ring */}
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
  const maxPresent = Math.max(...departmentData.map(d => d.present || 0), 1);

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
            const presentPx = Math.round((present / maxPresent) * 300);
            const absentPx  = absent > 0 ? Math.max(Math.round((absent  / maxPresent) * 300), 28) : 0;
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                {/* Label */}
                <span style={{ fontSize:12, color:'#555', fontWeight:500, width:175, textAlign:'right', flexShrink:0, lineHeight:1.3 }}>
                  {dept.department_name}
                </span>
                {/* Bars */}
                <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                  {present > 0 && (
                    <div style={{
                      width: presentPx, height:26,
                      background:'#28a745',
                      borderRadius: absent === 0 ? 6 : '6px 0 0 6px',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontSize:12, fontWeight:700,
                    }}>
                      {present}
                    </div>
                  )}
                  {absent > 0 && (
                    <div style={{
                      width: absentPx, height:26,
                      background:'#dc3545',
                      borderRadius: present === 0 ? 6 : '0 6px 6px 0',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontSize:12, fontWeight:700,
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
          <div className="sidebar-logo-circle">
            <i className="bi bi-building" style={{ fontSize:'28px', color:'white' }}></i>
          </div>
          <div className="sidebar-title"><h5>INSTITUTIONAL ADMIN SUPPORT</h5></div>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeMenu==='dashboard'?'active':''}`} onClick={()=>navigateToPage('dashboard')}>
            <i className="bi bi-grid-3x3-gap-fill"></i><span>Dashboard</span>
          </div>
          <div className={`nav-item ${activeMenu==='employees'?'active':''}`} onClick={()=>navigateToPage('employees')}>
            <i className="bi bi-people-fill"></i><span>Employees</span>
          </div>
          <div
            className={`nav-item nav-item-dropdown ${activeMenu==='events'?'active':''}`}
            onClick={()=>navigateToPage('events')}
            onMouseEnter={()=>setEventsDropdownOpen(true)}
            onMouseLeave={()=>setEventsDropdownOpen(false)}
          >
            <i className="bi bi-calendar-event-fill"></i><span>Events</span>
            <i className={`bi bi-chevron-${eventsDropdownOpen?'up':'down'} ms-auto`}></i>
            {eventsDropdownOpen && (
              <div className="dropdown-menu-custom">
                <div className={`dropdown-item-custom ${currentPage.page==='events'?'active':''}`} onClick={e=>{e.stopPropagation();navigateToPage('events');}}>
                  <i className="bi bi-list-task me-2"></i><span>Events Overview</span>
                </div>
                <div className="dropdown-item-custom" onClick={e=>{e.stopPropagation();navigateToPage('events');}}>
                  <i className="bi bi-people-fill me-2"></i><span>Event Attendance</span>
                </div>
              </div>
            )}
          </div>
          <div className={`nav-item ${activeMenu==='entryExit'?'active':''}`} onClick={()=>navigateToPage('entryExit')}>
            <i className="bi bi-box-arrow-right"></i><span>Entry/Exit</span>
          </div>
          <div className={`nav-item ${activeMenu==='settings'?'active':''}`} onClick={()=>navigateToPage('settings')}>
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
          {currentPage.page==='dashboard'    && renderDashboard()}
          {currentPage.page==='employees'    && <EmployeesPage />}
          {currentPage.page==='events'       && <EventsPage onNavigate={(page,data)=>navigateToPage(page,data)} />}
          {currentPage.page==='eventDetails' && <EventDetailsPage eventData={currentPage.data} onNavigate={page=>navigateToPage(page)} />}
          {currentPage.page==='entryExit'    && <EntryExitPage />}
          {currentPage.page==='settings'     && <Settingspage />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;