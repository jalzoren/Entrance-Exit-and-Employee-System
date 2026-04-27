// Dashboard.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  ResponsiveContainer,
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  PieChart as RePieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import "../../css/Dashboard.css";
import {
  FaBook, FaQuestionCircle, FaBolt, FaHeadset,
  FaPlusCircle, FaChartBar, FaDownload,
  FaEnvelope, FaCheckCircle, FaClock,
  FaCode, FaCalendar, FaCircle, FaSync,
} from "react-icons/fa";
import * as timeUtils from "../../utils/timeUtils";

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CLASSES
// ─────────────────────────────────────────────────────────────────────────────

class TimeService {
  static format(date) {
    return timeUtils.formatPhilippineTime(date);
  }
}

class DashboardService {
  /**
   * Fetches key metrics for today:
   * - onCampus: students with last action = ENTRY today
   * - totalEntries: all entry events today
   * - authSuccessRate: facial recognition success % today
   * - peakHour: busiest entry hour today
   * - totalStudents: total active enrolled students
   */
  static async fetchMetrics() {
    try {
      const res  = await fetch("/api/analytics/metrics");
      if (!res.ok) {
        const text = await res.text();
        console.error('[DashboardService.fetchMetrics] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      console.log('[DashboardService.fetchMetrics] Success:', data);
      return {
        onCampus:        data.onCampus        ?? 0,
        totalEntries:    data.totalEntries    ?? 0,
        authSuccessRate: data.authSuccessRate ?? 0,
        peakHour:        data.peakHour        ?? null,
        totalStudents:   data.totalStudents   ?? 0,
        visitorsOnCampus: data.visitorsOnCampus ?? 0,
      };
    } catch (err) {
      console.error('[DashboardService.fetchMetrics] FAILED:', err.message);
      return { onCampus: 0, totalEntries: 0, authSuccessRate: 0, peakHour: null, totalStudents: 0 };
    }
  }

  /**
   * Fetches daily traffic for the last N days.
   * Returns: [{ date: "YYYY-MM-DD", entrance: N, exit: N }, ...]
   * Backend fills in missing days with 0s so the chart is always continuous.
   */
  static async fetchTraffic(days = 7) {
    try {
      const res = await fetch(`/api/analytics/traffic?days=${days}`);
      if (!res.ok) {
        const text = await res.text();
        console.error('[DashboardService.fetchTraffic] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[DashboardService.fetchTraffic] Success:', data.length, 'entries');
      return data;
    } catch (err) {
      console.error('[DashboardService.fetchTraffic] FAILED:', err.message);
      return [];
    }
  }

  /**
   * Fetches current on-campus students grouped by college department.
   * Returns: [{ name: "College of Computer Studies", value: 12 }, ...]
   */
  static async fetchColleges() {
    try {
      const res = await fetch("/api/analytics/college-distribution");
      if (!res.ok) {
        const text = await res.text();
        console.error('[DashboardService.fetchColleges] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[DashboardService.fetchColleges] Success:', data.length, 'colleges');
      return data;
    } catch (err) {
      console.error('[DashboardService.fetchColleges] FAILED:', err.message);
      return [];
    }
  }

  static trafficSummary(data) {
    if (!data || data.length === 0) return null;
    const totalEntries = data.reduce((s, d) => s + (d.entrance ?? 0), 0);
    const totalExits   = data.reduce((s, d) => s + (d.exit    ?? 0), 0);
    const peakDay      = data.reduce((best, d) =>
      (d.entrance ?? 0) > (best.entrance ?? 0) ? d : best, data[0]);
    return { totalEntries, totalExits, peakDay: peakDay.date, peakEntries: peakDay.entrance ?? 0 };
  }

  static trafficDateRange(days) {
    return timeUtils.formatDateRange(days);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard() {
  const [serverTime,  setServerTime]  = useState(null);
  const [metrics,     setMetrics]     = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [collegeData, setCollegeData] = useState(null);
  const [trafficDays, setTrafficDays] = useState(7);
  const [chartKey,    setChartKey]    = useState(0);
  const [loadError,   setLoadError]   = useState(false);

  // ── Server clock ────────────────────────────────────────────────────────
  useEffect(() => {
    // Use local time - no backend dependency
    console.log('⏰ [Dashboard] Initializing local clock');
    setServerTime(new Date());
    
    // Update time every second
    const tick = setInterval(() => {
      setServerTime(new Date());
    }, 1000);
    
    return () => clearInterval(tick);
  }, []);

  // ── Initial data load ───────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      DashboardService.fetchMetrics(),
      DashboardService.fetchColleges(),
    ]).then(([m, c]) => {
      setMetrics(m);
      setCollegeData(c);
    }).catch(() => setLoadError(true));
  }, []);

  // ── Traffic re-fetch when day range changes ─────────────────────────────
  useEffect(() => {
    DashboardService.fetchTraffic(trafficDays).then(data => {
      setTrafficData(data);
      setChartKey(k => k + 1);
    });
  }, [trafficDays]);

  // ── Window resize → force chart re-render ──────────────────────────────
  useEffect(() => {
    const onResize = () => setChartKey(k => k + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const formatted      = serverTime ? TimeService.format(serverTime) : null;
  const summary        = useMemo(() => DashboardService.trafficSummary(trafficData), [trafficData]);
  const dateRangeLabel = useMemo(() => DashboardService.trafficDateRange(trafficDays), [trafficDays]);

  // Format peak hour for display  e.g. hour=8 → "8:00 AM"
  const peakHourLabel = useMemo(() => {
    return timeUtils.formatPeakHour(metrics?.peakHour);
  }, [metrics]);

  if (!formatted) return null;

  return (
    <div className="dashboard-wrapper">
      <div className="dashb">

        {/* ── HEADER ── */}
        <header className="campus-header">
          <div className="logo-area">
            <img className="seal-placeholder" src="../logoplp.gif" alt="PLP Seal" />
            <div className="university-info">
              <h1>Pamantasan ng Lungsod ng Pasig</h1>
              <p>ENTRANCE AND EXIT MONITORING SYSTEM</p>
            </div>
          </div>
          <div className="date-and-time">
            <div className="date-section">
              <span className="day">{formatted.day}</span>
              <span className="date">{formatted.date}</span>
            </div>
            <div className="time">{formatted.time}</div>
          </div>
        </header>

        {/* ── METRIC CARDS ── */}
        <section className="metrics-row">
          <MetricCard
            title="Currently On Campus"
            value={metrics?.onCampus ?? "—"}
            subtitle="STUDENTS"
            tooltip="Total students currently inside the campus based on active entry records without a corresponding exit."
          />
          <MetricCard
            title="Today's Total Entries"
            value={metrics?.totalEntries ?? "—"}
            subtitle="ENTRIES"
            tooltip="Counts all successful student entry events recorded for the current day."
          />
          <MetricCard
            title="Auth Success Rate"
            value={metrics?.authSuccessRate != null ? `${metrics.authSuccessRate}%` : "—"}
            subtitle="FACIAL RECOGNITION"
            tooltip="Percentage of successful facial recognition verifications today."
          />
          <MetricCard
            title="Visitors On Campus"
            value={metrics?.visitorsOnCampus ?? "—"}
            subtitle="ACTIVE VISITORS"
            tooltip="Visitors currently inside the campus based on latest entry without exit."
          />
        </section>

        {/* ── PEAK HOUR BANNER (only shows if there is data) ── */}
        {peakHourLabel && (
          <div className="peak-hour-banner">
            <FaBolt style={{ marginRight: 6 }} />
            Peak entry hour today: <strong>{peakHourLabel}</strong>
          </div>
        )}

        {/* ── LOAD ERROR ── */}
        {loadError && (
          <div className="load-error-banner">
            ⚠ Could not load some dashboard data. Check your server connection.
          </div>
        )}

        {/* ── CHARTS ── */}
        <section className="charts-grid">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Daily Traffic Trend</h3>
              <div className="chart-controls">
                <select value={trafficDays} onChange={e => setTrafficDays(Number(e.target.value))}>
                  <option value={7}>7 DAYS</option>
                  <option value={30}>30 DAYS</option>
                </select>
                <InfoIcon tooltip="Number of student entries and exits per day within the selected range." />
              </div>
            </div>
            {dateRangeLabel && <div className="chart-date-range">{dateRangeLabel}</div>}
            <div className="chart-area-wrap" style={{ minHeight: 300, width: "100%" }}>
              <TrafficAreaChart key={`traffic-${chartKey}`} data={trafficData} />
            </div>
            {summary && (
              <div className="chart-summary">
                <span>Total: <strong>{summary.totalEntries.toLocaleString()} entries</strong></span>
                <span className="summary-separator">·</span>
                <span><strong>{summary.totalExits.toLocaleString()} exits</strong></span>
                <span className="summary-separator">·</span>
                <span>Peak: <strong>{summary.peakDay} ({summary.peakEntries.toLocaleString()} entries)</strong></span>
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>College Department Distribution</h3>
              <InfoIcon tooltip="Proportion of students currently on campus by college department." />
            </div>
            <div className="chart-area-wrap" style={{ minHeight: 300, width: "100%" }}>
              <CollegePieChart key={`pie-${chartKey}`} data={collegeData} />
            </div>
          </div>
        </section>

        {/* ── QUICK ACTIONS ── */}
        <section className="quick-actions-section">
          <div className="section-header-wrapper">
            <h3><FaBolt /> Quick Actions</h3>
          </div>
          <div className="actions-grid">
            <button className="action-card primary">
              <span className="action-icon"><FaPlusCircle /></span>
              <div className="action-content">
                <span className="action-title">Register New Student</span>
                <span className="action-desc">Add student record</span>
              </div>
            </button>
            <button className="action-card success">
              <span className="action-icon"><FaChartBar /></span>
              <div className="action-content">
                <span className="action-title">Generate Report</span>
                <span className="action-desc">Export analytics</span>
              </div>
            </button>
            <button className="action-card warning">
              <span className="action-icon"><FaDownload /></span>
              <div className="action-content">
                <span className="action-title">Export Data</span>
                <span className="action-desc">CSV, PDF</span>
              </div>
            </button>
            <button className="action-card">
              <span className="action-icon"><FaEnvelope /></span>
              <div className="action-content">
                <span className="action-title">Contact Support</span>
                <span className="action-desc">24/7 assistance</span>
              </div>
            </button>
          </div>
        </section>

        {/* ── QUICK GUIDE ── */}
        <section className="quick-guide-section">
          <h3><FaBook /> Quick Guide &amp; FAQs</h3>
          <div className="guide-grid">
            {[
              { icon: <FaBook />,          title: "Getting Started",     items: ["Monitor real-time entries/exits","View daily traffic trends","Check college distribution","Generate reports weekly"] },
              { icon: <FaQuestionCircle />, title: "Frequently Asked",    items: ["How to add new students?","What if facial recognition fails?","How to export reports?","Who to contact for support?"] },
              { icon: <FaBolt />,           title: "Quick Tips",          items: ["Use filters to narrow logs","Hover over cards for details","Click charts to zoom","Export data as CSV"] },
              { icon: <FaHeadset />,        title: "Contact Support",     items: ["IT Helpdesk: ext. 1234","Email: support@plp.edu","Hours: 8AM - 5PM","Emergency: 0917-123-4567"] },
            ].map(({ icon, title, items }) => (
              <div key={title} className="guide-card">
                <div className="guide-icon">{icon}</div>
                <h4>{title}</h4>
                <ul>{items.map(i => <li key={i}><FaCircle />{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="dashboard-footer">
          <div className="footer-left">
            <span className="system-status"><span className="status-dot green"></span><FaCheckCircle /> System Online</span>
            <span className="separator">|</span>
            <span><FaClock /> Last Sync: {formatted.time}</span>
          </div>
          <div className="footer-right">
            <span><FaCalendar /> 2026 PLP Entrance Exit Monitoring System</span>
            <span className="separator">|</span>
            <span><FaCode /> v1.1.0</span>
            <span className="separator">|</span>
            <span><FaSync /> Build: 03.01</span>
          </div>
        </footer>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function InfoIcon({ tooltip }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const enter = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setCoords({ top: r.top + window.scrollY - 8, left: r.left + window.scrollX + r.width / 2 });
    }
    setVisible(true);
  }, []);

  return (
    <>
      <span ref={ref} className="info-icon" onMouseEnter={enter} onMouseLeave={() => setVisible(false)}>i</span>
      {visible && ReactDOM.createPortal(
        <div className="tooltip-portal" role="tooltip" style={{
          position: "fixed", top: coords.top - window.scrollY, left: coords.left,
          transform: "translate(-50%,-100%)", zIndex: 99999, pointerEvents: "none",
        }}>
          {tooltip}<span className="tooltip-arrow" />
        </div>,
        document.body
      )}
    </>
  );
}

function MetricCard({ title, value, subtitle, tooltip }) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        <InfoIcon tooltip={tooltip} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{subtitle}</div>
    </div>
  );
}

const TRAFFIC_COLORS = { entries: "#58761B", exits: "#D99201" };
const PIE_COLORS     = ["#5e5e5e","#54325f","#da719e","#ffeb36","#d11100","#0023be","#ff8800"];

function TrafficTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, entrance, exit } = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{date}</div>
      <div className="tt-entries">Entries: {(entrance ?? 0).toLocaleString()}</div>
      <div className="tt-exits">Exits: {(exit ?? 0).toLocaleString()}</div>
    </div>
  );
}

function TrafficAreaChart({ data }) {
  if (!data || data.length === 0) return <p className="chart-placeholder">No traffic data available yet.</p>;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReAreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <defs>
            <linearGradient id="gEntries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="gExits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} width={45} allowDecimals={false} />
          <ReTooltip content={<TrafficTooltip />} />
          <ReLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          <Area
            type="monotone" dataKey="entrance" name="Entries"
            stroke={TRAFFIC_COLORS.entries} strokeWidth={2}
            fill="url(#gEntries)" fillOpacity={0.6}
            dot={{ r: 3 }} activeDot={{ r: 5 }}
          />
          <Area
            type="monotone" dataKey="exit" name="Exits"
            stroke={TRAFFIC_COLORS.exits} strokeWidth={2}
            fill="url(#gExits)" fillOpacity={0.6}
            dot={{ r: 3 }} activeDot={{ r: 5 }}
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CollegePieChart({ data }) {
  if (!data || data.length === 0) return <p className="chart-placeholder">No campus population data yet.</p>;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="pie-wrap">
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data} cx="50%" cy="50%"
              innerRadius={40} outerRadius={80}
              paddingAngle={2} dataKey="value" label={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <ReTooltip
              formatter={(v, n) => [`${v.toLocaleString()} (${((v/total)*100).toFixed(1)}%)`, n]}
            />
          </RePieChart>
        </ResponsiveContainer>
      </div>
      <ul className="pie-legend">
        {data.map((d, i) => (
          <li key={d.name}>
            <span className="swatch" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="legend-text">
              {d.name} — {d.value.toLocaleString()} ({((d.value/total)*100).toFixed(0)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;