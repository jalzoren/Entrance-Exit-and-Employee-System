import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../css/Analytics.css';

const INITIAL_METRICS = {
  totalStudents: 10000,
  currentStudentsInside: 5500,
};

const INITIAL_TRAFFIC_DATA = [
  { date: 'Mon', entrance: 1240, exit: 1221 },
  { date: 'Tue', entrance: 1421, exit: 1229 },
  { date: 'Wed', entrance: 1100, exit: 1200 },
  { date: 'Thu', entrance: 1478, exit: 1200 },
  { date: 'Fri', entrance: 1189, exit: 1218 },
  { date: 'Sat', entrance: 1200, exit: 1250 },
  { date: 'Sun', entrance: 1100, exit: 1150 },
];

const INITIAL_COLLEGE_DATA = [
  {
    id: 1,
    collegeName: 'College of Computer Studies',
    presenceNow: 2400,
    totalStudents: 3000,
    percentage: 80,
  },
  {
    id: 2,
    collegeName: 'College of Nursing',
    presenceNow: 1250,
    totalStudents: 2500,
    percentage: 50,
  },
  {
    id: 3,
    collegeName: 'College of Engineering',
    presenceNow: 200,
    totalStudents: 1000,
    percentage: 20,
  },
  {
    id: 4,
    collegeName: 'College of Arts and Sciences',
    presenceNow: 800,
    totalStudents: 2000,
    percentage: 40,
  },
  {
    id: 5,
    collegeName: 'College of Business and Accountancy',
    presenceNow: 1500,
    totalStudents: 2500,
    percentage: 60,
  },
  {
    id: 6,
    collegeName: 'College of Education',
    presenceNow: 900,
    totalStudents: 1800,
    percentage: 50,
  },
  {
    id: 7,
    collegeName: 'College of International Hospitality Management',
    presenceNow: 600,
    totalStudents: 1200,
    percentage: 50,
  },
];

const INITIAL_AUTH_DATA = [
  { id: 1, method: 'Facial Recognition', attempts: 300, success: 270, successRate: '90%' },
  { id: 2, method: 'Manual Input', attempts: 100, success: 100, successRate: '100%' },
];

// Colors for charts
const COLORS = ['#01311d', '#548772', '#6a9b84', '#88b7a0', '#a6d5c0'];
const AUTH_COLORS = ['#01311d', '#d99201'];

function Analytics() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [trafficData, setTrafficData] = useState(INITIAL_TRAFFIC_DATA);
  const [collegeData, setCollegeData] = useState(INITIAL_COLLEGE_DATA);
  const [authData, setAuthData] = useState(INITIAL_AUTH_DATA);
  
  const [isLoading, setIsLoading] = useState(false); // Set to false initially to show data
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');
  
  // Pagination state for college data
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  
  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentCollegeData = collegeData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(collegeData.length / recordsPerPage);

  // Fetch data when timeRange changes
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // In a real app, you would fetch from your API
        // For now, we'll use the initial data
        
        // You can simulate different data based on timeRange
        if (timeRange === '30days') {
          // Generate more data points for 30 days
          const extendedData = [];
          for (let i = 1; i <= 30; i++) {
            extendedData.push({
              date: `Day ${i}`,
              entrance: Math.floor(Math.random() * 1000) + 800,
              exit: Math.floor(Math.random() * 1000) + 750,
            });
          }
          setTrafficData(extendedData);
        } else if (timeRange === '1year') {
          // Generate monthly data
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const yearlyData = months.map(month => ({
            date: month,
            entrance: Math.floor(Math.random() * 5000) + 3000,
            exit: Math.floor(Math.random() * 4800) + 2800,
          }));
          setTrafficData(yearlyData);
        } else {
          // Default to 7 days
          setTrafficData(INITIAL_TRAFFIC_DATA);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  // Calculate insights from data
  const getTrafficInsights = () => {
    if (!trafficData || trafficData.length === 0) return null;
    
    const highestTraffic = trafficData.reduce((max, day) => 
      day.entrance > max.entrance ? day : max
    );
    
    const lowestTraffic = trafficData.reduce((min, day) => 
      day.entrance < min.entrance ? day : min
    );
    
    return { highestTraffic, lowestTraffic };
  };

  const insights = getTrafficInsights();

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      pages.push(
        <button
          key={1}
          className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }
      
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }
      
      if (start > 2) {
        pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
      
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
      }
      
      pages.push(
        <button
          key={totalPages}
          className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  // Prepare data for pie chart
  const pieChartData = authData.map(item => ({
    name: item.method,
    value: item.attempts
  }));

  return (
    <div className="analytics-page">
      <header className="header-card">
        <h1>ANALYTICS & REPORTS</h1>
        <p className="subtitle">Dashboard / Analytics & Reports</p>
      </header>
      <hr className="header-divider" />

      {/* Analytics Content */}
      <div className="analytics-container">
        {/* Metrics Cards */}
        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-value">{metrics.totalStudents.toLocaleString()}</div>
            <div className="metric-label">TOTAL STUDENTS</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{metrics.currentStudentsInside.toLocaleString()}</div>
            <div className="metric-label">CURRENT STUDENTS INSIDE</div>
          </div>
        </div>

        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* SECTION 1: DAILY TRAFFIC TREND */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Daily Traffic Trend (Entries and Exits)</h2>
                <div className="time-range-selector">
                  <button
                    className={`range-btn ${timeRange === '7days' ? 'active' : ''}`}
                    onClick={() => setTimeRange('7days')}
                  >
                    7 Days
                  </button>
                  <button
                    className={`range-btn ${timeRange === '30days' ? 'active' : ''}`}
                    onClick={() => setTimeRange('30days')}
                  >
                    30 Days
                  </button>
                  <button
                    className={`range-btn ${timeRange === '1year' ? 'active' : ''}`}
                    onClick={() => setTimeRange('1year')}
                  >
                    1 Year
                  </button>
                </div>
              </div>

              {/* Traffic Chart */}
              <TrafficChart data={trafficData} />

              {/* INSIGHTS SECTION */}
              {insights && (
                <div className="insights">
                  <h4>Insights:</h4>
                  <ul>
                    <li>
                      <strong>Highest traffic:</strong> {insights.highestTraffic.date} ({insights.highestTraffic.entrance.toLocaleString()} entrances)
                    </li>
                    <li>
                      <strong>Lowest traffic:</strong> {insights.lowestTraffic.date} ({insights.lowestTraffic.entrance.toLocaleString()} entrances)
                    </li>
                    <li>
                      <strong>Peak hour today:</strong> 8:15 AM (350 entrances)
                    </li>
                  </ul>
                </div>
              )}
            </section>

            {/* SECTION 2: AUTHENTICATION METHOD */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Authentication Method Usage</h2>
                <button className="info-btn" title="More information">ℹ</button>
              </div>

              {/* Authentication Chart */}
              <AuthenticationChart data={authData} />

              {/* Table Section */}
              <div className="table-container small-table">
                <table className="analytics-table small-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Method</th>
                      <th>Attempts</th>
                      <th>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authData.map((auth, index) => (
                      <tr key={auth.id}>
                        <td>{index + 1}</td>
                        <td>{auth.method}</td>
                        <td>{auth.attempts.toLocaleString()}</td>
                        <td>{auth.successRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 3: COLLEGE DISTRIBUTION */}
            <section className="chart-section">
              <div className="section-header">
                <h2>College Distribution (Current Campus Population)</h2>
                <button className="info-btn" title="More information">ℹ</button>
              </div>

              {/* College Distribution Chart */}
              <CollegeDistributionChart data={collegeData} />

              {/* Summary Text */}
              <div className="campus-summary">
                <p>
                  <strong>Total students currently on campus:</strong>{' '}
                  {collegeData.reduce((sum, college) => sum + college.presenceNow, 0).toLocaleString()} students
                </p>
              </div>
  
              {/* Table Section */}
              <div className="table-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>College</th>
                      <th>Present Now</th>
                      <th>Total Students</th>
                      <th>% of Campus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCollegeData.map((college, index) => (
                      <tr key={college.id}>
                        <td>{indexOfFirstRecord + index + 1}</td>
                        <td>{college.collegeName}</td>
                        <td>{college.presenceNow.toLocaleString()}</td>
                        <td>{college.totalStudents.toLocaleString()}</td>
                        <td>{college.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>

                  <div className="page-numbers">
                    {renderPageNumbers()}
                  </div>

                  <button
                    className="pagination-button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// Traffic Chart Component
function TrafficChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="entranceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#58761B" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#58761B" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D99201" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#D99201" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" stroke="#666666" tick={{ fontSize: 12 }} />
          <YAxis stroke="#666666" tick={{ fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #01311d',
              borderRadius: '4px',
              fontSize: '12px',
              padding: '8px'
            }} 
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }} />
          <Area 
            type="monotone" 
            dataKey="entrance" 
            stroke="#58761B"
            strokeWidth={2}
            fill="url(#entranceGradient)"
            dot={{ fill: '#58761B', r: 3 }}
            activeDot={{ r: 5 }}
            name="Entrances"
          />
          <Area 
            type="monotone" 
            dataKey="exit" 
            stroke="#D99201"
            strokeWidth={2}
            fill="url(#exitGradient)"
            dot={{ fill: '#D99201', r: 3 }}
            activeDot={{ r: 5 }}
            name="Exits"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// College Distribution Chart Component
function CollegeDistributionChart({ data }) {
  // Sort data by presenceNow for better visualization
  const sortedData = [...data].sort((a, b) => b.presenceNow - a.presenceNow);
  
  return (
    <div className="chart-container college-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={sortedData} 
          layout="vertical"
          margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis type="number" stroke="#666666" tick={{ fontSize: 11 }} />
          <YAxis 
            type="category" 
            dataKey="collegeName" 
            stroke="#666666"
            width={110}
            tick={{ fontSize: 11 }}
          />
          <Tooltip 
            formatter={(value) => [value.toLocaleString(), "Present Now"]}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #01311d',
              borderRadius: '4px',
              fontSize: '11px',
              padding: '6px'
            }} 
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="presenceNow" fill="#58761B" name="Present Now" barSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Authentication Chart Component
function AuthenticationChart({ data }) {
  const pieData = data.map(item => ({
    name: item.method,
    value: item.attempts
  }));

  return (
    <div className="chart-container pie-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            outerRadius={100}
            dataKey="value"
            fontSize={12}
          >
            {pieData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={AUTH_COLORS[index % AUTH_COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #01311d',
              borderRadius: '4px',
              fontSize: '12px',
              padding: '8px'
            }} 
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Analytics;