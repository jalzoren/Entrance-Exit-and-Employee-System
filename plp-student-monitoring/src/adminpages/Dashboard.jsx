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
import "../css/Dashboard.css";
import { 
  FaBook, FaQuestionCircle, FaBolt, FaHeadset,
  FaPlusCircle, FaChartBar, FaDownload, FaCog,
  FaVideo, FaEnvelope, FaCheckCircle, FaClock,
  FaCode, FaCalendar, FaCircle, FaSync, FaTachometerAlt,
  FaInfoCircle, FaExclamationTriangle, FaBell
} from "react-icons/fa";


class TimeService {
  static async fetchServerTime() {
    const res = await fetch("http://localhost:5000/api/time");
    const data = await res.json();
    return new Date(data.serverTime);
  }

  /** Format a Date into the display shape the header needs. */
  static format(date) {
    const day = date
      .toLocaleDateString("en-PH", { weekday: "long" })
      .toUpperCase();
    const dateStr = date.toLocaleDateString("en-PH", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { day, date: dateStr, time: timeStr };
  }
}

/** Handles all dashboard metric/chart data concerns. */
class DashboardService {
  // ── METRICS ──────────────────────────────────────────────────────────────
  static async fetchMetrics() {
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (!res.ok) throw new Error("no metrics");
      return await res.json();
    } catch {
      // SAMPLE FALLBACK — replace with real data once backend is ready
      return { onCampus: 1_000, totalEntries: 1_000, authSuccessRate: 80 };
    }
  }

  // ── TRAFFIC CHART ─────────────────────────────────────────────────────────
  static async fetchTraffic(days = 7) {
    // prettier-ignore
    const sampleAll = [
      { day: "MON", entries: 150,  exits: 140  },
      { day: "TUE", entries: 180,  exits: 170  },
      { day: "WED", entries: 1240, exits: 1190 },
      { day: "THU", entries: 900,  exits: 850  },
      { day: "FRI", entries: 1100, exits: 1080 },
      { day: "SAT", entries: 2150, exits: 2100 },
      { day: "SUN", entries: 1820, exits: 1790 },
    ];
    return sampleAll.slice(0, days);
  }

  // ── COLLEGE DISTRIBUTION ─────────────────────────────────────────────────
static async fetchColleges() {
    // Sample data — each object needs `name` and `value` for Recharts <Pie>
    return [
      { name: "College of Computer Studies", value: 2000 },
      { name: "College of Arts and Sciences", value: 1000 },
      { name: "College of Nursing", value: 1000 },
      { name: "College of Business and Accountancy", value: 1000 },
      { name: "College of International Hospitality Management", value: 2000 },
      { name: "College of Education", value: 3000 },
      { name: "College of Engineering", value: 2500 },
     
    ];
  }

  // ── COMPUTED SUMMARIES ────────────────────────────────────────────────────
  /** Returns { totalEntries, totalExits, peakDay, peakEntries } for the footer. */
  static trafficSummary(data) {
    if (!data || data.length === 0) return null;
    const totalEntries = data.reduce((s, d) => s + (d.entries ?? 0), 0);
    const totalExits   = data.reduce((s, d) => s + (d.exits   ?? 0), 0);
    const peak         = data.reduce((a, b) => (b.entries > a.entries ? b : a));
    return {
      totalEntries,
      totalExits,
      peakDay: peak.day,
      peakEntries: peak.entries,
    };
  }

  /** Build the date-range label shown above the area chart (e.g. "Jan 25 – 31, 2026"). */
  static trafficDateRange(days) {
    const end   = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fmt = (d) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard() {
  const [serverTime,   setServerTime]   = useState(null);
  const [metrics,      setMetrics]      = useState(null);
  const [trafficData,  setTrafficData]  = useState(null);
  const [collegeData,  setCollegeData]  = useState(null);
  const [trafficDays,  setTrafficDays]  = useState(7);
  const [chartKey, setChartKey] = useState(0); // Add key for forcing re-renders

  // ── Clock effect ────────────────────────────────────────────────────────
  useEffect(() => {
    let baseTime;
    let tickInterval;
    let syncInterval;

    const syncClock = async () => {
      try {
        baseTime = await TimeService.fetchServerTime();
        setServerTime(new Date(baseTime));
        clearInterval(tickInterval);
        tickInterval = setInterval(() => {
          baseTime = new Date(baseTime.getTime() + 1000);
          setServerTime(new Date(baseTime));
        }, 1000);
      } catch {
        // If server is unreachable, fall back to local time
        baseTime = new Date();
        setServerTime(new Date(baseTime));
        tickInterval = setInterval(() => {
          baseTime = new Date(baseTime.getTime() + 1000);
          setServerTime(new Date(baseTime));
        }, 1000);
      }
    };

    syncClock();
    syncInterval = setInterval(syncClock, 60_000);

    // CLEANUP: always clear intervals when component unmounts
    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, []);

  // ── Data loading effect ─────────────────────────────────────────────────
  useEffect(() => {
    DashboardService.fetchMetrics().then(setMetrics);
    DashboardService.fetchColleges().then(setCollegeData);
  }, []);

  // Re-fetch traffic whenever the user changes the day-range dropdown
  useEffect(() => {
    DashboardService.fetchTraffic(trafficDays).then(setTrafficData);
    // Force chart re-render when data changes
    setChartKey(prev => prev + 1);
  }, [trafficDays]);

  // ── Derived values (memoised so they don't recalculate on every render) ─
  const formatted    = serverTime ? TimeService.format(serverTime) : null;
  const summary      = useMemo(() => DashboardService.trafficSummary(trafficData), [trafficData]);
  const dateRangeLabel = useMemo(() => DashboardService.trafficDateRange(trafficDays), [trafficDays]);

  // Handle window resize to force chart re-render
  useEffect(() => {
    const handleResize = () => {
      setChartKey(prev => prev + 1);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render anything until the clock is ready (avoids flash)
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
            tooltip="Shows the total number of students currently inside the campus based on active entry records without a corresponding exit."
          />
          <MetricCard
            title="Today's Total Entries"
            value={metrics?.totalEntries ?? "—"}
            subtitle="ENTRIES"
            tooltip="Counts all successful student entry events recorded for the current day."
          />
          <MetricCard
            title="Auth Success Rate"
            value={metrics?.authSuccessRate ? `${metrics.authSuccessRate}%` : "—"}
            subtitle="FACIAL RECOGNITION"
            tooltip="Percentage of successful identity verifications during entry using facial recognition."
          />
        </section>

        {/* ── CHARTS ── */}
        <section className="charts-grid">
          {/* Chart 1 — Daily Traffic Trend (Area Chart) */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Daily Traffic Trend</h3>
              <div className="chart-controls">
                <select
                  value={trafficDays}
                  onChange={(e) => setTrafficDays(Number(e.target.value))}
                >
                  <option value={7}>7 DAYS</option>
                  <option value={30}>30 DAYS</option>
                </select>
                <InfoIcon tooltip="Displays the number of student entries and exits per day within the selected time range." />
              </div>
            </div>

            {dateRangeLabel && (
              <div className="chart-date-range">{dateRangeLabel}</div>
            )}

            <div className="chart-area-wrap" style={{ minHeight: '300px', width: '100%' }}>
              <TrafficAreaChart 
                key={`traffic-${chartKey}`} 
                data={trafficData} 
              />
            </div>

            {summary && (
              <div className="chart-summary">
                <span>Weekly Total: <strong>{summary.totalEntries.toLocaleString()} entries</strong></span>
                <span className="summary-separator">·</span>
                <span><strong>{summary.totalExits.toLocaleString()} exits</strong></span>
                <span className="summary-separator">·</span>
                <span>Peak: <strong>{summary.peakDay} ({summary.peakEntries.toLocaleString()} entries)</strong></span>
              </div>
            )}
          </div>

          {/* Chart 2 — College Department Distribution (Pie Chart) */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>College Department Distribution</h3>
              <InfoIcon tooltip="Shows the proportion of student traffic by college or department currently on campus today." />
            </div>
            <div className="chart-area-wrap" style={{ minHeight: '300px', width: '100%' }}>
              <CollegePieChart 
                key={`pie-${chartKey}`} 
                data={collegeData} 
              />
            </div>
          </div>
        </section>


        
{/* ── QUICK ACTIONS ── */}
<section className="quick-actions-section">
  <div className="section-header-wrapper">
    <h3><FaBolt /> Quick Actions</h3>
    <span className="section-badge">4 available</span>
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
        <span className="action-desc">CSV, PDF, Excel</span>
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

<section className="quick-guide-section">
  <h3><FaBook /> Quick Guide & FAQs</h3>
  <div className="guide-grid">
    <div className="guide-card">
      <div className="guide-icon"><FaBook /></div>
      <h4>Getting Started</h4>
      <ul>
        <li><FaCircle /> Monitor real-time entries/exits</li>
        <li><FaCircle /> View daily traffic trends</li>
        <li><FaCircle /> Check college distribution</li>
        <li><FaCircle /> Generate reports weekly</li>
      </ul>
    </div>
    
    <div className="guide-card">
      <div className="guide-icon"><FaQuestionCircle /></div>
      <h4>Frequently Asked</h4>
      <ul>
        <li><FaCircle /> How to add new students?</li>
        <li><FaCircle /> What if facial recognition fails?</li>
        <li><FaCircle /> How to export reports?</li>
        <li><FaCircle /> Who to contact for support?</li>
      </ul>
    </div>
    
    <div className="guide-card">
      <div className="guide-icon"><FaBolt /></div>
      <h4>Quick Tips</h4>
      <ul>
        <li><FaCircle /> Use filters to narrow logs</li>
        <li><FaCircle /> Hover over cards for details</li>
        <li><FaCircle /> Click charts to zoom</li>
        <li><FaCircle /> Export data as CSV</li>
      </ul>
    </div>
    
    <div className="guide-card">
      <div className="guide-icon"><FaHeadset /></div>
      <h4>Contact Support</h4>
      <ul>
        <li><FaCircle /> IT Helpdesk: ext. 1234</li>
        <li><FaCircle /> Email: support@plp.edu</li>
        <li><FaCircle /> Hours: 8AM - 5PM</li>
        <li><FaCircle /> Emergency: 0917-123-4567</li>
      </ul>
    </div>
  </div>
</section>


{/* ── FOOTER WITH SYSTEM STATUS ── */}
<footer className="dashboard-footer">
  <div className="footer-left">
    <span className="system-status">
      <span className="status-dot green"></span>
      <FaCheckCircle /> System Online
    </span>
    <span className="separator">|</span>
    <span><FaClock /> Last Sync: {formatted.time}</span>
    <span className="separator">|</span>
    <span><FaTachometerAlt /> API: 45ms</span>
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

function InfoIcon({ tooltip }) {
  const [visible, setVisible]   = useState(false);
  const [coords,  setCoords]    = useState({ top: 0, left: 0 });
  const iconRef                 = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top:  rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
    setVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => setVisible(false), []);

  const tooltipPortal = visible
    ? ReactDOM.createPortal(
        <div
          className="tooltip-portal"
          style={{
            position: "fixed",
            top:  coords.top  - window.scrollY,
            left: coords.left,
            transform: "translate(-50%, -100%)",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          role="tooltip"
        >
          {tooltip}
          <span className="tooltip-arrow" />
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span
        ref={iconRef}
        className="info-icon"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        i
      </span>
      {tooltipPortal}
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

const TRAFFIC_COLORS = {
  entries: "#58761B",
  exits:   "#D99201",
};

const PIE_COLORS = [
  "#5e5e5e",
  "#54325f",
  "#da719e",
  "#ffeb36",
  "#d11100",
  "#0023be",
  "#ff8800",
];

function TrafficTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, entries, exits } = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{date}</div>
      <div className="tt-entries">Entries: {entries?.toLocaleString() || 0}</div>
      <div className="tt-exits">Exits: {exits?.toLocaleString() || 0}</div>
    </div>
  );
}

function TrafficAreaChart({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  if (!data || data.length === 0) {
    return <p className="chart-placeholder">No traffic data</p>;
  }

  const formatted = data.map((d) => ({
    date: d.date || d.day,
    entries: d.entries ?? d.entry ?? d.entrances ?? 0,
    exits: d.exits ?? d.exit ?? d.exiting ?? 0,
  }));

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="chart-container" 
      style={{ width: '100%', height: '100%', minHeight: '280px' }}
    >
      {dimensions.width > 0 && (
        <ResponsiveContainer width="100%" height="100%">
          <ReAreaChart 
            data={formatted} 
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <defs>
              <linearGradient id="gEntries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="gExits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              width={45}
            />
            <ReTooltip content={<TrafficTooltip />} />
            <ReLegend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
            
            <Area
              type="monotone"
              dataKey="entries"
              name="Entries"
              stroke={TRAFFIC_COLORS.entries}
              strokeWidth={2}
              fill="url(#gEntries)"
              fillOpacity={0.6}
              dot={{ r: 3, fill: TRAFFIC_COLORS.entries }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="exits"
              name="Exits"
              stroke={TRAFFIC_COLORS.exits}
              strokeWidth={2}
              fill="url(#gExits)"
              fillOpacity={0.6}
              dot={{ r: 3, fill: TRAFFIC_COLORS.exits }}
              activeDot={{ r: 5 }}
            />
          </ReAreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function CollegePieChart({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  if (!data || data.length === 0) {
    return <p className="chart-placeholder">No distribution data</p>;
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const CustomLegend = () => (
    <ul className="pie-legend">
      {data.map((entry, i) => {
        const pct = ((entry.value / total) * 100).toFixed(0);
        return (
          <li key={entry.name}>
            <span 
              className="swatch" 
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} 
            />
            <span className="legend-text">
              {entry.name} ({pct}%)
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
    <div ref={containerRef} className="pie-wrap">
      <div className="pie-chart-wrapper" style={{ width: '100%', height: '250px' }}>
        {dimensions.width > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={dimensions.width < 400 ? 30 : 40}
                outerRadius={dimensions.width < 400 ? 60 : 80}
                paddingAngle={2}
                dataKey="value"
                label={false}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <ReTooltip 
                formatter={(value, name) => [
                  `${value.toLocaleString()} (${((value/total)*100).toFixed(1)}%)`, 
                  name
                ]}
              />
            </RePieChart>
          </ResponsiveContainer>
        )}
      </div>
      <CustomLegend />
    </div>
    
    </>
  );
}

export default Dashboard;