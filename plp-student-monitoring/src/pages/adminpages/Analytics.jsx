// Analytics.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../../css/Analytics.css';
import GenerateReportFilter from '../../components/GenerateReportFilter';
import GenerateReportPdf from '../../components/GenerateReportPdf';
import { reportToXml, xmlToReport, downloadXml, downloadHtml, xmlToHtml, openXmlReportWindow } from '../../utils/xmlReportUtils';
import * as timeUtils from '../../utils/timeUtils';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_COLORS = ['#01311d', '#d99201', '#4a90d9'];

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE  (all data comes from the database via analytics.js routes)
// ─────────────────────────────────────────────────────────────────────────────

const AnalyticsService = {
  /**
   * GET /api/analytics/metrics
   * Returns: { onCampus, totalEntries, totalStudents, authSuccessRate, peakHour }
   */
  async fetchMetrics() {
    try {
      const res = await fetch('/api/analytics/metrics');
      if (!res.ok) {
        const text = await res.text();
        console.error('[AnalyticsService.fetchMetrics] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`metrics: HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[AnalyticsService.fetchMetrics] Success:', data);
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchMetrics] FAILED:', err.message);
      throw err;
    }
  },

  /**
   * GET /api/analytics/traffic?days=7|30|365
   * Returns: [{ date, entrance, exit }, ...]
   */
  async fetchTraffic(days = 7) {
    try {
      const res = await fetch(`/api/analytics/traffic?days=${days}`);
      if (!res.ok) {
        const text = await res.text();
        console.error('[AnalyticsService.fetchTraffic] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`traffic: HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[AnalyticsService.fetchTraffic] Success:', data.length, 'entries');
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchTraffic] FAILED:', err.message);
      throw err;
    }
  },

  /**
   * GET /api/analytics/departments
   * Returns: [{ fullCollegeName, collegeName, presenceNow, totalStudents, percentage }, ...]
   */
  async fetchDepartments() {
    try {
      const res = await fetch('/api/analytics/departments');
      if (!res.ok) {
        const text = await res.text();
        console.error('[AnalyticsService.fetchDepartments] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`departments: HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[AnalyticsService.fetchDepartments] Success:', data.length, 'departments');
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchDepartments] FAILED:', err.message);
      throw err;
    }
  },

  /**
   * GET /api/analytics/auth-methods
   * Returns: [{ id, method, attempts, success, successRate }, ...]
   */
  async fetchAuthMethods() {
    try {
      const res = await fetch('/api/analytics/auth-methods');
      if (!res.ok) {
        const text = await res.text();
        console.error('[AnalyticsService.fetchAuthMethods] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`auth-methods: HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[AnalyticsService.fetchAuthMethods] Success:', data.length, 'methods');
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchAuthMethods] FAILED:', err.message);
      throw err;
    }
  },

  /**
   * GET /api/analytics/report?from=YYYY-MM-DD&to=YYYY-MM-DD&dept=
   * Full structured dataset for PDF report generation.
   */
  async fetchReport(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to',   filters.to);
      if (filters.dept) params.set('dept', filters.dept);
      const res = await fetch(`/api/analytics/report?${params}`);
      if (!res.ok) {
        const text = await res.text();
        console.error('[AnalyticsService.fetchReport] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`report: HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[AnalyticsService.fetchReport] Success');
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchReport] FAILED:', err.message);
      throw err;
    }
  },

  async fetchVisitorStats() {
    const res = await fetch('/api/analytics/visitor-stats');
    if (!res.ok) throw new Error('visitor-stats failed');
    return res.json();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Analytics() {
  // ── State ────────────────────────────────────────────────────────────────
  const [metrics,      setMetrics]      = useState({ totalStudents: 0, currentStudentsInside: 0 });
  const [trafficData,  setTrafficData]  = useState([]);
  const [collegeData,  setCollegeData]  = useState([]);
  const [authData,     setAuthData]     = useState([]);
  const [timeRange,    setTimeRange]    = useState('7days');
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState(null);
  const [visitorData, setVisitorData] = useState([]);

  // Report / PDF state
  const [showFilterPopup,  setShowFilterPopup]  = useState(false);
  const [showPdfPreview,   setShowPdfPreview]   = useState(false);
  const [filteredReportData, setFilteredReportData] = useState(null);
  const [appliedFilters,   setAppliedFilters]   = useState({});
  const pdfRef = useRef(null);

  // Pagination for college table
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // ── Days mapping ─────────────────────────────────────────────────────────
  const daysMap = { '7days': 7, '30days': 30, '1year': 365 };

  // ── Load all data ────────────────────────────────────────────────────────
  const loadAll = useCallback(async (days) => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsData, trafficRaw, deptData, authRaw, visitorStats] = await Promise.all([
        AnalyticsService.fetchMetrics(),
        AnalyticsService.fetchTraffic(days),
        AnalyticsService.fetchDepartments(),
        AnalyticsService.fetchAuthMethods(),
        AnalyticsService.fetchVisitorStats(),
      ]);

      setMetrics({
        totalStudents:        metricsData.totalStudents        ?? 0,
        currentStudentsInside: metricsData.onCampus            ?? 0,
      });
      setTrafficData(trafficRaw);
      setCollegeData(deptData);
      setAuthData(authRaw);
      setVisitorData(visitorStats);
    } catch (err) {
      console.error('[Analytics] loadAll error:', err);
      setError('Failed to load analytics data. Please check your server connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-load whenever time range changes
  useEffect(() => {
    loadAll(daysMap[timeRange] ?? 7);
    setCurrentPage(1);
  }, [timeRange, loadAll]);

  // ── Traffic insights ─────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!trafficData || trafficData.length === 0) return null;
    const nonZero = trafficData.filter(d => d.entrance > 0);
    if (nonZero.length === 0) return null;
    const highest = nonZero.reduce((a, b) => b.entrance > a.entrance ? b : a);
    const lowest  = nonZero.reduce((a, b) => b.entrance < a.entrance ? b : a);
    return { highest, lowest };
  }, [trafficData]);

  const visitorChartData = useMemo(() => {
    if (!visitorData || visitorData.length === 0) return [];
  
    const entry = visitorData.filter(v => v.action?.toLowerCase() === "entry").length;
    const exit  = visitorData.filter(v => v.action?.toLowerCase() === "exit").length;
  
    return [
      { name: "ENTRY", value: entry },
      { name: "EXIT", value: exit }
    ];
  }, [visitorData]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const indexOfFirst      = (currentPage - 1) * recordsPerPage;
  const currentCollegeData = collegeData.slice(indexOfFirst, indexOfFirst + recordsPerPage);
  const totalPages        = Math.ceil(collegeData.length / recordsPerPage);

  // ── Report generation ────────────────────────────────────────────────────
  const handleApplyFilters = async (filters) => {
    setAppliedFilters(filters);
    try {
      // Convert UI filter shape to query params
      const reportParams = {};
      if (filters.dateRange?.from) {
        // from might be "DD/MM/YYYY" — convert to "YYYY-MM-DD"
        const parts = filters.dateRange.from.split('/');
        if (parts.length === 3) reportParams.from = `${parts[2]}-${parts[1]}-${parts[0]}`;
        else reportParams.from = filters.dateRange.from;
      }
      if (filters.dateRange?.to) {
        const parts = filters.dateRange.to.split('/');
        if (parts.length === 3) reportParams.to = `${parts[2]}-${parts[1]}-${parts[0]}`;
        else reportParams.to = filters.dateRange.to;
      }
      if (filters.collegeDepartment) reportParams.dept = filters.collegeDepartment;

      const reportData = await AnalyticsService.fetchReport(reportParams);

      // ── XML round-trip ──────────────────────────────────────────────────
      // 1. Convert JSON response to XML (satisfies XML requirement)
      // 2. Parse XML back to a clean object (single source of truth for PDF)
      const xmlString  = reportToXml(reportData, reportParams);
      const parsedData = xmlToReport(xmlString);

      // Optionally expose the XML for download / debugging
      console.log('[Analytics] Generated XML report:\n', xmlString);

      setFilteredReportData({
        ...parsedData,
        // Keep the XML string so GenerateReportPdf can attach it if needed
        _xml: xmlString,
        dateRange: filters.dateRange?.from && filters.dateRange?.to
          ? `${filters.dateRange.from} - ${filters.dateRange.to}`
          : parsedData.dateRange,
      });
      setShowPdfPreview(true);
    } catch (err) {
      console.error('[Analytics] report fetch error:', err);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleDownloadPDF = () => pdfRef.current?.generatePDF();

  const handleDownloadHtml = async () => {
    if (!filteredReportData?._xml) {
      alert('No XML data available');
      return;
    }
    try {
      const htmlString = await xmlToHtml(filteredReportData._xml);
      const date = new Date().toISOString().slice(0, 10);
      downloadHtml(htmlString, `eems-report-${date}.html`);
    } catch (err) {
      console.error('Error downloading HTML:', err);
      alert('Failed to download HTML report');
    }
  };

  const handleViewHtmlReport = async () => {
    if (!filteredReportData?._xml) {
      alert('No XML data available');
      return;
    }
    try {
      openXmlReportWindow(filteredReportData._xml);
    } catch (err) {
      console.error('Error opening report window:', err);
      alert('Failed to open report window');
    }
  };

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    setFilteredReportData(null);
  };

  // ── Pagination helpers ───────────────────────────────────────────────────
  const renderPageNumbers = () => {
    const pages = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button key={i} className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}>{i}</button>
        );
      }
    } else {
      pages.push(
        <button key={1} className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => setCurrentPage(1)}>1</button>
      );
      let start = Math.max(2, currentPage - 1);
      let end   = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2) end = Math.min(totalPages - 1, 4);
      if (currentPage >= totalPages - 1) start = Math.max(2, totalPages - 3);
      if (start > 2) pages.push(<span key="e1" className="ellipsis">...</span>);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}>{i}</button>
        );
      }
      if (end < totalPages - 1) pages.push(<span key="e2" className="ellipsis">...</span>);
      pages.push(
        <button key={totalPages} className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
      );
    }
    return pages;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="analytics-page">
      <header className="header-card">
        <h1>ANALYTICS &amp; REPORTS</h1>
        <p className="subtitle">Dashboard / Analytics &amp; Reports</p>
      </header>
      <hr className="header-divider" />

      <div className="analytics-container">

        {/* ── TOP ROW: generate button + metric cards ── */}
        <div className="metrics-row">
          <div className="filter-group button-group">
            <button
              className="generate-report-btn"
              onClick={() => setShowFilterPopup(true)}
              style={{
                background: 'linear-gradient(135deg, #01311d 0%, #548772 100%)',
                color: 'white', border: 'none', padding: '12px 24px',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
              }}
            >
              Generate Report
            </button>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.totalStudents.toLocaleString()}</div>
            <div className="metric-label">TOTAL STUDENTS</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.currentStudentsInside.toLocaleString()}</div>
            <div className="metric-label">CURRENT STUDENTS INSIDE</div>
          </div>
        </div>

        {/* ── LOADING / ERROR ── */}
        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        )}
        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => loadAll(daysMap[timeRange] ?? 7)}>Retry</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ── CHART 1: Daily Traffic Trend ── */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Daily Traffic Trend (Entries and Exits)</h2>
                <div className="time-range-selector">
                  {[['7days','7 Days'],['30days','30 Days'],['1year','1 Year']].map(([v,l]) => (
                    <button key={v}
                      className={`range-btn ${timeRange === v ? 'active' : ''}`}
                      onClick={() => setTimeRange(v)}>{l}</button>
                  ))}
                </div>
              </div>
              <TrafficChart data={trafficData} />
              {insights && (
                <div className="insights">
                  <h4>Insights:</h4>
                  <ul>
                    <li><strong>Highest traffic:</strong> {insights.highest.date} ({insights.highest.entrance.toLocaleString()} entries)</li>
                    <li><strong>Lowest traffic:</strong>  {insights.lowest.date}  ({insights.lowest.entrance.toLocaleString()} entries)</li>
                  </ul>
                </div>
              )}
              {(!trafficData || trafficData.length === 0) && (
                <p className="no-data-msg">No traffic data available for this period.</p>
              )}
            </section>

            {/* ── CHART 2: Authentication Method Usage ── */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Authentication Method Usage</h2>
                <button className="info-btn" title="Shows how students authenticated at the gate.">ℹ</button>
              </div>
              {authData.length > 0 ? (
                <>
                  <AuthenticationChart data={authData} />
                  <div className="table-container small-table">
                    <table className="analytics-table small-table">
                      <thead>
                        <tr><th>No.</th><th>Method</th><th>Attempts</th><th>Success</th></tr>
                      </thead>
                      <tbody>
                        {authData.map((auth, i) => (
                          <tr key={auth.id}>
                            <td>{i + 1}</td>
                            <td>{auth.method}</td>
                            <td>{auth.attempts.toLocaleString()}</td>
                            <td>{auth.successRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="no-data-msg">No authentication data available yet.</p>
              )}
            </section>

            {/* ── CHART 3: Department Distribution ── */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Department Distribution (Current Campus Population)</h2>
                <button className="info-btn" title="Students currently on campus by department.">ℹ</button>
              </div>
              {collegeData.length > 0 ? (
                <>
                  <CollegeDistributionChart data={collegeData} />
                  <div className="campus-summary">
                    <p>
                      <strong>Total students by department:</strong>{' '}
                      {collegeData.reduce((s, d) => s + d.presenceNow, 0).toLocaleString()} students currently on campus
                    </p>
                  </div>
                  <div className="table-container">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Department</th>
                          <th>Present Now</th>
                          <th>Total Enrolled</th>
                          <th>% of Campus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCollegeData.map((college, i) => (
                          <tr key={college.fullCollegeName}>
                            <td>{indexOfFirst + i + 1}</td>
                            <td title={college.fullCollegeName}>{college.fullCollegeName}</td>
                            <td>{college.presenceNow.toLocaleString()}</td>
                            <td>{college.totalStudents.toLocaleString()}</td>
                            <td>{college.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button className="pagination-button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}>← Previous</button>
                      <div className="page-numbers">{renderPageNumbers()}</div>
                      <button className="pagination-button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}>Next →</button>
                    </div>
                  )}
                </>
              ) : (
                <p className="no-data-msg">No department data available. Students need to be on campus.</p>
              )}
            </section>
            <section className="chart-section">
              <div className="section-header">
                <h2>Visitor Entry and Exit</h2>
              </div>

              {visitorData.length > 0 ? (
                <VisitorChart data={visitorData} />
              ) : (
                <p className="no-data-msg">No visitor data available.</p>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── FILTER POPUP ── */}
      {showFilterPopup && (
        <GenerateReportFilter
          onClose={() => setShowFilterPopup(false)}
          onGenerate={handleApplyFilters}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      {/* ── PDF PREVIEW MODAL ── */}
      {showPdfPreview && filteredReportData && (
        <div className="modal-overlay" onClick={handleClosePdfPreview} style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()} style={{
            borderRadius: '12px', width: '90%', maxWidth: '1000px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div className="pdf-preview-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid #e0e0e0',
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Report Preview</h2>
              <button onClick={handleClosePdfPreview} style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666',
              }}>×</button>
            </div>
            <div className="pdf-preview-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <GenerateReportPdf ref={pdfRef} reportData={filteredReportData} filters={appliedFilters} />
            </div>
            <div className="pdf-preview-footer" style={{
              display: 'flex', justifyContent: 'flex-end', gap: '12px',
              padding: '16px 20px', borderTop: '1px solid #e0e0e0',
            }}>
              <button onClick={handleClosePdfPreview} style={{
                padding: '10px 20px', backgroundColor: '#f5f5f5',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}>Close</button>
              <button
                onClick={handleViewHtmlReport}
                title="View HTML report in new window"
                style={{
                  padding: '10px 20px', backgroundColor: '#4a90d9', color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                }}
              >View HTML Report</button>
              {filteredReportData?._xml && (
                <button
                  onClick={() => {
                    const date = new Date().toISOString().slice(0,10);
                    downloadXml(filteredReportData._xml, `eems-report-${date}.xml`);
                  }}
                  style={{
                    padding: '10px 20px', backgroundColor: '#4a90d9', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                  }}
                >Download XML</button>
              )}
              <button
                onClick={handleDownloadHtml}
                title="Download as HTML file"
                style={{
                  padding: '10px 20px', backgroundColor: '#d99201', color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                }}
              >Download HTML</button>
              <button onClick={handleDownloadPDF} style={{
                padding: '10px 20px', backgroundColor: '#548772', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TrafficChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="entranceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#58761B" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#58761B" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#D99201" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#D99201" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} interval="preserveStartEnd" />
          <YAxis stroke="#666" tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }} />
          <Area type="monotone" dataKey="entrance" name="Entrances"
            stroke="#58761B" strokeWidth={2} fill="url(#entranceGradient)"
            dot={{ fill: '#58761B', r: 3 }} activeDot={{ r: 5 }} />
          <Area type="monotone" dataKey="exit" name="Exits"
            stroke="#D99201" strokeWidth={2} fill="url(#exitGradient)"
            dot={{ fill: '#D99201', r: 3 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CollegeDistributionChart({ data }) {
  // Use full department name for chart
  const chartData = [...data].sort((a, b) => b.presenceNow - a.presenceNow);
  return (
    <div className="chart-container college-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 160, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis type="number" stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="fullCollegeName" stroke="#666" width={150} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v, n) => [v.toLocaleString(), n]}
            contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '11px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="presenceNow" fill="#58761B" name="Present Now" barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AuthenticationChart({ data }) {
  const pieData = data.map(d => ({ name: d.method, value: d.attempts }));
  return (
    <div className="chart-container pie-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <Pie
            data={pieData} cx="50%" cy="50%"
            labelLine outerRadius={100} dataKey="value" fontSize={12}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={AUTH_COLORS[i % AUTH_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function VisitorChart({ data }) {
  const COLORS = ['#4a90d9', '#d99201'];

  return (
    <div className="chart-container pie-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Analytics;