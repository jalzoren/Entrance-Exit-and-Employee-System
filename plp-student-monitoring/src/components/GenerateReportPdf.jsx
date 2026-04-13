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

  const leftLogoSrc = '/logo.png'; 
  const rightLogoSrc = '/logo3.png'; 

  // Use reportData from props
  const {
    totalStudents = 5500,
    totalCapacity = 10000,
    dateRange = 'Jan 26, 2026 - Jan 31, 2026',
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
      { name: 'Face Recognition', percentage: 35, count: 3500, total: 10000 },
      { name: 'Manual Input', percentage: 65, count: 6500, total: 10000 }
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#e0e0e0', 
      padding: '30px 20px',
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      {/* Download Button */}
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto 20px auto', 
        textAlign: 'center'
      }}>
  
      </div>

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
        {/* ========== HEADER WITH LOGOS ON BOTH SIDES ========== */}
        <div style={{
          padding: '30px 30px 20px 30px',
          borderBottom: '2px solid #000',
        }}>
          {/* Header with Left Logo, Center Text, Right Logo */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            {/* Left Logo */}
            <div style={{
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={leftLogoSrc}
                alt="University Logo Left"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div style="width:70px;height:70px;background:#f0f0f0;border:2px solid #ccc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">LOGO</div>';
                }}
              />
            </div>
            
            {/* Center Text */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#01311d',
                letterSpacing: '1px'
              }}>
                PAMANTASAN NG LUNGSOD NG PASIG
              </div>
              <div style={{
                fontSize: '12px',
                color: '#01311d',
                marginTop: '5px'
              }}>
                Alcalde Jose St., Kapasigan, Pasig City
              </div>
            </div>
            
            {/* Right Logo */}
            <div style={{
              width: '80px',
              height: '80px',
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
                  e.target.parentElement.innerHTML = '<div style="width:70px;height:70px;background:#f0f0f0;border:2px solid #ccc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">LOGO</div>';
                }}
              />
            </div>
          </div>
          
          {/* Divider Line */}
          <div style={{ 
            borderTop: '2px solid #01311d', 
            margin: '10px 0 15px 0'
          }}></div>
          
          {/* System Title - Centered */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#01311d',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              ENTRANCE AND EXIT STUDENT MONITORING SYSTEM
            </div>
          </div>
          
          {/* Divider */}
          <div style={{ borderTop: '1px solid #ccc', margin: '15px 0' }}></div>
          
          {/* Report Title */}
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            letterSpacing: '1px',
            color: '#000',
            textAlign: 'center'
          }}>
            SUMMARY REPORT
          </h1>
          
          {/* Description */}
          <p style={{ 
            color: '#555', 
            fontSize: '12px', 
            lineHeight: '1.6',
            marginBottom: '20px',
            textAlign: 'right'
          }}>
            This summary report provides an overview of student entrance and exit activity within the selected date range. 
            It presents key attendance metrics, authentication method distribution, traffic trends, and detailed logs to 
            support administrative monitoring and data-driven decision-making.
          </p>
          
          <div style={{ borderTop: '1px solid #ccc', margin: '15px 0' }}></div>
          
          {/* Total Students Banner */}
          <div style={{ textAlign: 'center', margin: '25px 0 15px 0' }}>
            <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#000' }}>
              {totalStudents.toLocaleString()} / {totalCapacity.toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px', letterSpacing: '1px', color: '#333' }}>
              TOTAL STUDENTS
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
              {dateRange}
            </div>
          </div>
        </div>

        {/* ========== CHART 1: Distribution by College ========== */}
        <div style={{ padding: '25px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#000'
          }}>
            Chart 1: Distribution of Students by College
          </h3>
          
          {collegeData.map((college, idx) => (
            <div key={idx} style={{ marginBottom: '15px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                <span>{college.name}</span>
                <span>{college.count.toLocaleString()} ({college.percentage}%)</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '20px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${college.percentage}%`, 
                  height: '100%', 
                  backgroundColor: college.percentage === 100 ? '#4CAF50' : '#2196F3',
                  borderRadius: '3px'
                }}></div>
              </div>
            </div>
          ))}
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
                  backgroundColor: idx === 0 ? '#FF9800' : '#9C27B0',
                  borderRadius: '3px'
                }}></div>
              </div>
            </div>
          ))}
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

        {/* ========== TRAFFIC INSIGHTS ========== */}
        <div style={{ padding: '25px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#000'
          }}>
            Insights
          </h3>
          
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Highest traffic: </span>
            <span style={{ fontSize: '13px', color: '#555' }}>{trafficData.highest}</span>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Lowest traffic: </span>
            <span style={{ fontSize: '13px', color: '#555' }}>{trafficData.lowest}</span>
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Peak Hour Today: </span>
            <span style={{ fontSize: '13px', color: '#555' }}>{trafficData.peakHour}</span>
          </div>
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
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>No.</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Date & Time</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Student ID</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold', color: '#333' }}>College Department</th>
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
                  <tr>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>1</td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>[Entrance] [Exit]</td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>Face Recognition</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>2</td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}>3</td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                    <td style={{ padding: '10px 8px', border: '1px solid #ddd', color: '#555' }}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default GenerateReportPdf;