<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html>
      <head>
        <meta charset="UTF-8"/>
        <title>EEMS Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
          }
          .report-container {
            max-width: 1200px;
            margin: 20px auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .report-header {
            background: linear-gradient(135deg, #01311d 0%, #548772 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .report-header h1 { font-size: 28px; margin-bottom: 10px; }
          .report-header p { font-size: 14px; opacity: 0.9; }
          .meta-section {
            padding: 20px 30px;
            border-bottom: 1px solid #e0e0e0;
            background: #fafafa;
          }
          .meta-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 10px;
          }
          .meta-item {
            padding: 12px;
            background: white;
            border-left: 4px solid #01311d;
            border-radius: 4px;
          }
          .meta-label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; }
          .meta-value { font-size: 18px; color: #01311d; font-weight: bold; margin-top: 5px; }
          .content-section {
            padding: 30px;
          }
          .section-title {
            font-size: 20px;
            color: #01311d;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #548772;
          }
          .traffic-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
          }
          .summary-card {
            padding: 15px;
            background: white;
            border-left: 4px solid #d99201;
            border-radius: 4px;
          }
          .summary-card.high { border-left-color: #58761B; }
          .summary-label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; }
          .summary-value { font-size: 16px; color: #01311d; font-weight: bold; margin-top: 8px; word-break: break-word; }
          .chart-section {
            margin: 30px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
          }
          thead {
            background: #01311d;
            color: white;
          }
          th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
          }
          tbody tr:hover { background: #f5f5f5; }
          tbody tr:nth-child(even) { background: #fafafa; }
          .page-break { page-break-after: always; margin: 20px 0; }
          .footer {
            padding: 20px 30px;
            background: #fafafa;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          @media print {
            body { background: white; }
            .report-container { box-shadow: none; margin: 0; border-radius: 0; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- Header -->
          <div class="report-header">
            <h1>Entrance &amp; Exit Monitoring System</h1>
            <p>EEMS Report</p>
          </div>

          <!-- Metadata Section -->
          <div class="meta-section">
            <div class="meta-row">
              <div class="meta-item">
                <div class="meta-label">Generated At</div>
                <div class="meta-value">
                  <xsl:value-of select="/eems-report/meta/generatedAt"/>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Date Range</div>
                <div class="meta-value">
                  <xsl:value-of select="/eems-report/meta/dateRange"/>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Total Students</div>
                <div class="meta-value">
                  <xsl:value-of select="/eems-report/meta/totalStudents"/>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Total Logs</div>
                <div class="meta-value">
                  <xsl:value-of select="/eems-report/meta/totalLogs"/>
                </div>
              </div>
            </div>
          </div>

          <!-- Content Section -->
          <div class="content-section">

            <!-- Traffic Summary -->
            <h2 class="section-title">Traffic Summary</h2>
            <div class="traffic-summary">
              <div class="summary-card high">
                <div class="summary-label">Highest Traffic Day</div>
                <div class="summary-value">
                  <xsl:value-of select="/eems-report/trafficSummary/highest"/>
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Lowest Traffic Day</div>
                <div class="summary-value">
                  <xsl:value-of select="/eems-report/trafficSummary/lowest"/>
                </div>
              </div>
            </div>

            <!-- Traffic Chart Data -->
            <div class="chart-section">
              <h3 class="section-title">Daily Traffic Data</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entrances</th>
                    <th>Exits</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/trafficChart/day">
                    <tr>
                      <td><xsl:value-of select="@date"/></td>
                      <td><xsl:value-of select="@entrance"/></td>
                      <td><xsl:value-of select="@exit"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>

            <!-- College Distribution -->
            <div class="chart-section">
              <h3 class="section-title">College/Department Distribution</h3>
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Department</th>
                    <th>Present Now</th>
                    <th>Total Students</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/collegeDistribution/college">
                    <tr>
                      <td><xsl:value-of select="@no"/></td>
                      <td><xsl:value-of select="@name"/></td>
                      <td><xsl:value-of select="@count"/></td>
                      <td><xsl:value-of select="@totalStudents"/></td>
                      <td><xsl:value-of select="@percentage"/>%</td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>

            <!-- Authentication Methods -->
            <div class="chart-section">
              <h3 class="section-title">Authentication Methods</h3>
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Method</th>
                    <th>Count</th>
                    <th>Percentage</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/authMethods/method">
                    <tr>
                      <td><xsl:value-of select="@no"/></td>
                      <td><xsl:value-of select="@name"/></td>
                      <td><xsl:value-of select="@count"/></td>
                      <td><xsl:value-of select="@percentage"/>%</td>
                      <td><xsl:value-of select="@total"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>

            <!-- Student Logs -->
            <xsl:if test="/eems-report/studentLogs/entry">
              <div class="chart-section page-break">
                <h3 class="section-title">Student Entry/Exit Logs</h3>
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Date/Time</th>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Program</th>
                      <th>Year Level</th>
                      <th>Action</th>
                      <th>Method</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <xsl:for-each select="/eems-report/studentLogs/entry">
                      <tr>
                        <td><xsl:value-of select="@no"/></td>
                        <td><xsl:value-of select="@dateTime"/></td>
                        <td><xsl:value-of select="@studentId"/></td>
                        <td><xsl:value-of select="@name"/></td>
                        <td><xsl:value-of select="@department"/></td>
                        <td><xsl:value-of select="@program"/></td>
                        <td><xsl:value-of select="@yearLevel"/></td>
                        <td><xsl:value-of select="@action"/></td>
                        <td><xsl:value-of select="@method"/></td>
                        <td><xsl:value-of select="@accuracy"/></td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </div>
            </xsl:if>

          </div>

          <!-- Footer -->
          <div class="footer">
            <p>Generated by EEMS on <xsl:value-of select="/eems-report/meta/generatedAt"/></p>
            <p>© 2024-2026 PLP Students - Entrance and Exit Monitoring System</p>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
