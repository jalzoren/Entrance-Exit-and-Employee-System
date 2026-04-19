import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import html2pdf from 'html2pdf.js';

const GenerateReportPdf = forwardRef(({ reportData, filters }, ref) => {
  const reportRef = useRef(null);

  // Generate PDF function
  const handleGeneratePDF = async () => {
    if (!reportRef.current) {
      console.error('Report ref is not available');
      return;
    }

    const element = reportRef.current;
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `student_attendance_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    generatePDF: handleGeneratePDF,
    generateWithFilters: handleGeneratePDF
  }));

  const leftLogoSrc1 = '/pasig.png';
  const leftLogoSrc2 = '/pasig_agos.png';
  const leftLogoSrc3 = '/logo.png';
  const rightLogoSrc = '/logo3.png';

  // Get current generation date
  const generationDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Use reportData from props
  const {
    totalStudents = 5500,
    totalCapacity = 10000,
    collegeData = [
      { name: 'CCS', count: 2400, percentage: 80 },
      { name: 'CAS', count: 540, percentage: 90 },
      { name: 'CON', count: 1250, percentage: 50 },
      { name: 'CBA', count: 540, percentage: 90 },
      { name: 'COE', count: 200, percentage: 50 },
      { name: 'CHIM', count: 540, percentage: 90 },
      { name: 'CCED', count: 1000, percentage: 100 }
    ],
    methodData = [
      { name: 'Face Recognition', percentage: 35, count: 3500 },
      { name: 'Manual Input', percentage: 65, count: 6500 }
    ],
    successData = [
      { method: 'Facial Recognition', attempts: 300, successRate: 80, successCount: 240 },
      { method: 'Manual Input', attempts: 100, successRate: 100, successCount: 100 }
    ],
    trafficData = { 
      highest: 'Wednesday (1,240 entries)', 
      lowest: 'Sunday (180 entries)', 
      peakHour: '8:15 AM (320 entries)' 
    },
    studentLogs = []
  } = reportData;

  // Helper function to get green color based on percentage
  const getGreenColor = (percentage) => {
    if (percentage >= 90) return '#1B5E20';
    if (percentage >= 75) return '#2E7D32';
    if (percentage >= 50) return '#388E3C';
    if (percentage >= 25) return '#4CAF50';
    return '#81C784';
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#e0e0e0', 
      padding: '20px 10px',
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      {/* REPORT CONTENT - This gets converted to PDF */}
      <div 
        ref={reportRef} 
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: 'white',
          fontFamily: 'Arial, Helvetica, sans-serif',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}
      >
        {/* ========== HEADER WITH 3 LOGOS LEFT, 1 LOGO RIGHT ========== */}
        <div style={{
          padding: '30px 30px 20px 30px',
          borderBottom: '2px solid #000',
        }}>
          {/* Header with 3 Left Logos, Center Text, 1 Right Logo */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            {/* 3 Left Logos */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '25px',
              width: 'auto'
            }}>
              <div style={{
                width: '55px',
                height: '55px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={leftLogoSrc1}
                  alt="University Logo Left 1"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="width:50px;height:50px;background:#f0f0f0;border:2px solid #ccc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;">LOGO</div>';
                  }}
                />
              </div>
              <div style={{
                width: '65px',
                height: '65px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={leftLogoSrc2}
                  alt="University Logo Left 2"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="width:50px;height:50px;background:#f0f0f0;border:2px solid #ccc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;">LOGO</div>';
                  }}
                />
              </div>
              <div style={{
                width: '55px',
                height: '55px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={leftLogoSrc3}
                  alt="University Logo Left 3"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="width:50px;height:50px;background:#f0f0f0;border:2px solid #ccc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;">LOGO</div>';
                  }}
                />
              </div>
            </div>
            
            {/* Center Text */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#01311d',
                letterSpacing: '1px',
                borderBottom: '1px solid #01311d',
                display: 'inline-block',
                fontFamily: 'Cinzel, sans-serif',
              }}>
                PAMANTASAN NG LUNGSOD NG PASIG
              </div>
            
              <div style={{
                fontSize: '11px',
                color: '#01311d',
                marginTop: '-5px',
                fontFamily: 'Cinzel, sans-serif',
                fontWeight: 'bold',
              }}>
                ENTRANCE AND EXIT STUDENT MONITORING SYSTEM
              </div>
            </div>
            
            {/* 1 Right Logo */}
            <div style={{
              width: '70px',
              height: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={rightLogoSrc}
                alt="University Logo Right"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div style="width:60px;height:60px;background:#f0f0f0;border:2px solid #ccc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">LOGO</div>';
                }}
              />
            </div>
          </div>
          
          <div style={{ 
            borderTop: '2px solid #01311d', 
            margin: '10px 0 15px 0'
          }}></div>
          
          {/* Divider */}
          <div style={{ borderTop: '1px solid #fff', margin: '15px 0' }}></div>
     
          {/* Report Title - LEFT and Subtitle - RIGHT */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end',
            marginBottom: '40px'
          }}>
            <h1 style={{ 
              fontSize: '38px', 
              fontWeight: 'bold', 
              margin: 0,
              letterSpacing: '1px',
              color: '#01311d',
              fontFamily: 'Oswald, serif'
            }}>
              SUMMARY REPORT
            </h1>
            
            <p style={{ 
              color: '#555', 
              fontSize: '10px', 
              lineHeight: '1.4',
              margin: 0,
              textAlign: 'right',
              maxWidth: '45%'
            }}>
              This summary report provides an overview of student entrance and exit activity within the selected date range. 
              It presents key attendance metrics, authentication method distribution, traffic trends, and detailed logs to 
              support administrative monitoring and data-driven decision-making.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #fff', margin: '15px 0' }}></div>

          {/* Total Students and Chart 1 Section */}
          <div style={{ 
            display: 'flex', 
            gap: '30px',
            margin: '25px 0 15px 0',
            alignItems: 'flex-start'
          }}>
            {/* Left Column - Total Students with Generation Date underneath */}
            <div style={{ 
              flex: '0 0 35%',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              {/* Total Students Green Box */}
              <div style={{ 
                backgroundColor: 'rgba(1, 49, 29, 0.85)',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  fontSize: '48px', 
                  fontWeight: 'bold', 
                  color: 'white',
                  marginBottom: '10px'
                }}>
                  {totalStudents.toLocaleString()} / {totalCapacity.toLocaleString()}
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  color: 'white',
                  letterSpacing: '1px',
                  marginBottom: '5px'
                }}>
                  TOTAL STUDENTS
                </div>
              </div>

              {/* Generation Date Box */}
              <div style={{ 
                backgroundColor: 'rgba(1, 49, 29, 0.85)',
                borderRadius: '10px',
                padding: '15px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  Generation Date: {generationDate}
                </div>
              </div>
            </div>

            {/* Chart 1 - College Distribution - Progress Bars */}
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '15px',
                marginTop: '0',
                color: '#000'
              }}>
                Chart 1: Distribution of Students by College
              </h3>
              
              {collegeData.map((college, idx) => (
                <div key={idx} style={{ marginBottom: '12px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    <span>{college.name}</span>
                    <span>{college.count.toLocaleString()} ({college.percentage}%)</span>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '18px', 
                    backgroundColor: '#e0e0e0', 
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${college.percentage}%`, 
                      height: '100%', 
                      backgroundColor: getGreenColor(college.percentage),
                      borderRadius: '3px'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========== DAILY TRAFFIC TREND SECTION ========== */}
        <div style={{ padding: '25px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#000'
          }}>
            Daily Traffic Trend (Entries and Exits)
          </h3>
          
          {/* Simple table for traffic data */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#01311d' }}>
                <th style={{ padding: '10px', textAlign: 'center', color: 'white' }}>Day</th>
                <th style={{ padding: '10px', textAlign: 'center', color: 'white' }}>Entrances</th>
                <th style={{ padding: '10px', textAlign: 'center', color: 'white' }}>Exits</th>
               </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>Monday</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,240</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,221</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>Tuesday</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,421</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,229</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>Wednesday</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,478</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,200</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>Thursday</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,389</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,218</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>Friday</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,189</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>1,118</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>Saturday</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>800</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>750</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>Sunday</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>500</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>480</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                <td style={{ padding: '10px', textAlign: 'center' }}>Total</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>8,017</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>7,716</td>
              </tr>
            </tfoot>
          </table>
          
          {/* Insights */}
          <div style={{ 
            marginTop: '20px',
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>Highest traffic: </span>
              <span style={{ fontSize: '12px', color: '#555' }}>{trafficData.highest}</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>Lowest traffic: </span>
              <span style={{ fontSize: '12px', color: '#555' }}>{trafficData.lowest}</span>
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>Peak Hour Today: </span>
              <span style={{ fontSize: '12px', color: '#555' }}>{trafficData.peakHour}</span>
            </div>
          </div>
        </div>

        {/* ========== SUCCESS RATE TABLE ========== */}
        <div style={{ padding: '25px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#000'
          }}>
            Success Rate by Method
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>No.</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Method</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>Attempts</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>Success</th>
               </tr>
            </thead>
            <tbody>
              {successData.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 8px', color: '#555' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 8px', color: '#555' }}>{item.method}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#555' }}>{item.attempts}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#555' }}>
                    {item.successRate}% ({item.successCount}/{item.attempts})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ========== CHART 2: Distribution by Method of Entry ========== */}
        <div style={{ padding: '25px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#000'
          }}>
            Chart 2: Distribution of Students by Method of Entry
          </h3>
          
          {methodData.map((method, idx) => (
            <div key={idx} style={{ marginBottom: '15px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                <span>{method.name}</span>
                <span>{method.percentage}% ({method.count.toLocaleString()})</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '20px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${method.percentage}%`, 
                  height: '100%', 
                  backgroundColor: idx === 0 ? '#2E7D32' : '#D99201',
                  borderRadius: '3px'
                }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* ========== STUDENT LOGS TABLE ========== */}
        <div style={{ padding: '25px 30px 35px 30px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#000'
          }}>
            Student Entry/Exit Logs
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>No.</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Date & Time</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Student ID</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Name</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>College</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Action</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Method</th>
                </tr>
              </thead>
              <tbody>
                {studentLogs.length > 0 ? (
                  studentLogs.map((log, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>{log.no || index + 1}</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>{log.dateTime || ''}</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>{log.studentId || ''}</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>{log.name || ''}</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>{log.department || ''}</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>
                        {log.action ? `[${log.action}]` : '[Entrance] [Exit]'}
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>{log.method || 'Face Recognition'}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>1</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2026-01-26 08:15:00</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2024-00001</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>Juan Dela Cruz</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>CCS</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>[Entrance]</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>Face Recognition</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2026-01-26 17:30:00</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2024-00001</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>Juan Dela Cruz</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>CCS</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>[Exit]</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>Face Recognition</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>3</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2026-01-27 09:00:00</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2024-00123</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>Maria Santos</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>CAS</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>[Entrance]</td>
                      <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>Manual Input</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

GenerateReportPdf.displayName = 'GenerateReportPdf';

export default GenerateReportPdf;