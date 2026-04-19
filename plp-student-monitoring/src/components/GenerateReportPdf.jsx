import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import html2pdf from 'html2pdf.js';
import '../componentscss/GenerateReportPdf.css'; // Import the CSS file

const GenerateReportPdf = forwardRef(({ reportData }, ref) => {
  const reportRef = useRef(null);

  // Generate PDF function with proper margins
  const handleGeneratePDF = async () => {
    if (!reportRef.current) {
      console.error('Report ref is not available');
      return;
    }

    const element = reportRef.current;
    const opt = {
      margin: [0, 0, 0, 0],
      filename: `student_attendance_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        letterRendering: true, 
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    generatePDF: handleGeneratePDF,
    generateWithFilters: handleGeneratePDF
  }));

  const leftLogoSrc1 = '/pasig.png';
  const leftLogoSrc2 = '/pasig_agos.png';
  const leftLogoSrc3 = '/logo.png';
  const rightLogoSrc = '/logo3.png';

  const generationDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const {
    totalStudents = 0,
    totalCapacity = 0,
    dateRange = 'All Time',
    collegeData = [],
    methodData = [],
    successData = [],
    trafficData = { 
      highest: 'N/A', 
      lowest: 'N/A', 
      peakHour: 'N/A' 
    },
    trafficChartData = [],
    studentLogs = []
  } = reportData;

  const getGreenColor = (percentage) => {
    if (percentage >= 90) return '#1B5E20';
    if (percentage >= 75) return '#2E7D32';
    if (percentage >= 50) return '#388E3C';
    if (percentage >= 25) return '#4CAF50';
    return '#81C784';
  };

  return (
    <div className="pdf-container">
      <div ref={reportRef} className="pdf-report">
        {/* ========== HEADER ========== */}
        <div className="pdf-header">
          <div className="pdf-logos-row">
            <div className="pdf-left-logos">
              <div className="pdf-logo-box">
                <img 
                  src={leftLogoSrc1}
                  alt="Logo 1"
                  className="pdf-logo-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="pdf-logo-placeholder">LOGO</div>';
                  }}
                />
              </div>
              <div className="pdf-logo-box" style={{ width: '65px', height: '65px' }}>
                <img 
                  src={leftLogoSrc2}
                  alt="Logo 2"
                  className="pdf-logo-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="pdf-logo-placeholder">LOGO</div>';
                  }}
                />
              </div>
              <div className="pdf-logo-box">
                <img 
                  src={leftLogoSrc3}
                  alt="Logo 3"
                  className="pdf-logo-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="pdf-logo-placeholder">LOGO</div>';
                  }}
                />
              </div>

              <div className="pdf-logo-box" style={{ width: '70px', height: '70px' }}>
              <img 
                src={rightLogoSrc}
                alt="Logo Right"
                className="pdf-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="pdf-logo-placeholder">LOGO</div>';
                }}
              />
            </div>
            </div>
            
            <div className="pdf-center-text">
              <div className="pdf-university-name">
                PAMANTASAN NG LUNGSOD NG PASIG
              </div>
              <div className="pdf-system-title">
                ENTRANCE AND EXIT STUDENT MONITORING SYSTEM
              </div>
            </div>
            
            
          </div>
          
          <div style={{ borderTop: '2px solid #01311d', margin: '10px 0 15px 0' }}></div>
          <div style={{ borderTop: '1px solid #fff', margin: '15px 0' }}></div>
     
          <div className="pdf-title-row">
            <h1 className="pdf-main-title">SUMMARY REPORT</h1>
            <p className="pdf-subtitle">
              This summary report provides an overview of student entrance and exit activity within the selected date range. 
              It presents key attendance metrics, authentication method distribution, traffic trends, and detailed logs to 
              support administrative monitoring and data-driven decision-making.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #fff', margin: '15px 0' }}></div>

          <div className="pdf-stats-section">
            <div className="pdf-stats-left">
              <div className="pdf-green-box">
                <div className="pdf-big-number">
                  {totalStudents.toLocaleString()} / {totalCapacity.toLocaleString()}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', letterSpacing: '1px' }}>
                  TOTAL STUDENTS
                </div>
              </div>

              <div className="pdf-green-box-small">
                <div style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>
                  Generation Date: {generationDate}
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h3 className="pdf-chart-title">Chart 1: Distribution of Students by Department</h3>
              
              {collegeData && collegeData.length > 0 ? (
                collegeData.map((college, idx) => (
                  <div key={idx} className="pdf-progress-bar-container" title={college.fullName || college.name}>
                    <div className="pdf-progress-label">
                      <span style={{ fontWeight: 'bold', minWidth: '60px' }}>{college.name}</span>
                      <span>{college.count.toLocaleString()} ({college.percentage}%)</span>
                    </div>
                    <div className="pdf-progress-bar-bg">
                      <div 
                        className="pdf-progress-bar-fill"
                        style={{ 
                          width: `${college.percentage}%`, 
                          backgroundColor: getGreenColor(college.percentage)
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#999', fontSize: '12px' }}>No department data available. Please ensure students have department information in the system.</p>
              )}
            </div>
          </div>
        </div>

        {/* ========== DAILY TRAFFIC TREND TABLE ========== */}
        <div className="pdf-section-spacing">
          <h3 className="pdf-section-title">Daily Traffic Trend (Entries and Exits)</h3>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            <strong>Date Range:</strong> {dateRange}
          </p>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Date/Day</th>
                  <th>Entrances</th>
                  <th>Exits</th>
                </tr>
              </thead>
              <tbody>
                {trafficChartData && trafficChartData.length > 0 ? (
                  trafficChartData.map((day, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'center' }}>{day.date}</td>
                      <td style={{ textAlign: 'center' }}>{day.entrance.toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>{day.exit.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: '#999' }}>No traffic data available</td>
                  </tr>
                )}
              </tbody>
              {trafficChartData && trafficChartData.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }}>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#01311d' }}>Total</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#01311d' }}>
                      {trafficChartData.reduce((sum, day) => sum + day.entrance, 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#01311d' }}>
                      {trafficChartData.reduce((sum, day) => sum + day.exit, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          
          <div className="pdf-insights-box">
            <div style={{ marginBottom: '8px' }}>
              <span className="pdf-insight-text">Highest traffic: </span>
              <span style={{ fontSize: '12px', color: '#333' }}>{trafficData.highest}</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span className="pdf-insight-text">Lowest traffic: </span>
              <span style={{ fontSize: '12px', color: '#333' }}>{trafficData.lowest}</span>
            </div>
            <div>
              <span className="pdf-insight-text">Peak Hour: </span>
              <span style={{ fontSize: '12px', color: '#333' }}>{trafficData.peakHour}</span>
            </div>
          </div>
        </div>

        {/* ========== SUCCESS RATE TABLE ========== */}
        <div className="pdf-section-spacing">
          <h3 className="pdf-section-title">Success Rate by Method</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="pdf-table pdf-table-left">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>No.</th>
                  <th style={{ textAlign: 'left' }}>Method</th>
                  <th style={{ textAlign: 'right' }}>Attempts</th>
                  <th style={{ textAlign: 'right' }}>Success</th>
                </tr>
              </thead>
              <tbody>
                {successData && successData.length > 0 ? (
                  successData.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'left' }}>{item.method}</td>
                      <td style={{ textAlign: 'right' }}>{item.attempts.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        {item.successRate}% ({item.successCount.toLocaleString()}/{item.attempts.toLocaleString()})
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No success rate data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========== CHART 2 ========== */}
        <div className="pdf-section-spacing">
          <h3 className="pdf-section-title">Chart 2: Distribution of Students by Method of Entry</h3>
          
          {methodData && methodData.length > 0 ? (
            methodData.map((method, idx) => (
              <div key={idx} className="pdf-method-bar">
                <div className="pdf-method-label">
                  <span>{method.name}</span>
                  <span>{method.percentage}% ({method.count.toLocaleString()})</span>
                </div>
                <div className="pdf-method-bar-bg">
                  <div style={{ 
                    width: `${method.percentage}%`, 
                    height: '100%', 
                    backgroundColor: idx === 0 ? '#2E7D32' : '#D99201',
                    borderRadius: '3px'
                  }}></div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#999', fontSize: '12px' }}>No method data available</p>
          )}
        </div>

        {/* ========== STUDENT LOGS TABLE ========== */}
        <div className="pdf-last-section">
          <h3 className="pdf-section-title">Student Entry/Exit Logs</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="pdf-table pdf-table-left">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>No.</th>
                  <th style={{ textAlign: 'left' }}>Date & Time</th>
                  <th style={{ textAlign: 'left' }}>Student ID</th>
                  <th style={{ textAlign: 'left' }}>Name</th>
                  <th style={{ textAlign: 'left' }}>College</th>
                  <th style={{ textAlign: 'left' }}>Action</th>
                  <th style={{ textAlign: 'left' }}>Method</th>
                </tr>
              </thead>
              <tbody>
                {studentLogs && studentLogs.length > 0 ? (
                  studentLogs.slice(0, 20).map((log, index) => (
                    <tr key={index}>
                      <td>{log.no || index + 1}</td>
                      <td>{log.dateTime || ''}</td>
                      <td>{log.studentId || 'N/A'}</td>
                      <td>{log.name || 'Unknown'}</td>
                      <td>{log.department || 'N/A'}</td>
                      <td>{log.action || 'Entry'}</td>
                      <td>{log.method || 'Face Recognition'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                      No student logs available for this report
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {studentLogs && studentLogs.length > 20 && (
            <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
              Showing first 20 of {studentLogs.length} records. See full report for complete data.
            </p>
          )}
        </div>
        {/* ========== FOOTER ========== */}
<div className="pdf-footer">
  <div className="pdf-footer-content">
    <div className="pdf-footer-left">
      <span className="pdf-footer-text">
        ENTRANCE AND EXIT STUDENT MONITORING SYSTEM<br></br>
        PAMANTASAN NG LUNGSOD NG PASIG |         Powered by College of Computer Studies

      </span>
    </div>
    <div className="pdf-footer-right">
      <span className="pdf-footer-text">
        © {new Date().getFullYear()} All Rights Reserved
      </span>
    </div>
  </div>
</div>
      </div>
      
    </div>
  );
});

GenerateReportPdf.displayName = 'GenerateReportPdf';

export default GenerateReportPdf;