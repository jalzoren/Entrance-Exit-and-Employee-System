/**
 * xmlReportUtils.js
 * 
 * Converts report data (from /api/analytics/report) to an XML string,
 * and provides a parser that reads that XML back into a structured object
 * for use by GenerateReportPdf.
 *
 * WHY XML:
 * - Satisfies the project requirement to use XML in the system.
 * - Acts as a clean, portable document format between the backend response
 *   and the PDF renderer — the same XML could be saved, emailed, or re-imported.
 *
 * FLOW:
 *   API response (JSON)
 *     → reportToXml()   → XML string  (can be stored / inspected)
 *     → xmlToReport()   → report object (fed into GenerateReportPdf)
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Escape special XML characters in a string value. */
function esc(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

/** Wrap content in a tag with optional attributes. */
function tag(name, content, attrs = {}) {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
  if (content === null || content === undefined || content === '') {
    return `<${name}${attrStr}/>`;
  }
  return `<${name}${attrStr}>${content}</${name}>`;
}

/** Create a self-closing tag with all data as attributes (useful for simple rows). */
function attrTag(name, obj) {
  const attrs = Object.entries(obj)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
  return `<${name}${attrs}/>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON → XML
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a report data object (as returned by GET /api/analytics/report)
 * into a well-formed XML string.
 *
 * @param {Object} reportData  - The object from AnalyticsService.fetchReport()
 * @param {Object} filters     - The filter params used to generate the report
 * @returns {string}           - UTF-8 XML string
 */
export function reportToXml(reportData, filters = {}) {
  const {
    generatedAt    = '',
    dateRange      = '',
    totalStudents  = 0,
    totalLogs      = 0,
    collegeData    = [],
    methodData     = [],
    trafficChartData = [],
    trafficData    = {},
    studentLogs    = [],
  } = reportData;

  // ── Meta ────────────────────────────────────────────────────────────────
  const metaXml = tag('meta',
    tag('generatedAt', esc(generatedAt)) +
    tag('dateRange',   esc(dateRange))   +
    tag('totalStudents', totalStudents)  +
    tag('totalLogs',     totalLogs)      +
    tag('filters',
      tag('from',       esc(filters.from       || '')) +
      tag('to',         esc(filters.to         || '')) +
      tag('department', esc(filters.dept        || filters.collegeDepartment || ''))
    )
  );

  // ── Traffic summary ──────────────────────────────────────────────────────
  const trafficSummaryXml = tag('trafficSummary',
    tag('highest', esc(trafficData.highest || 'N/A')) +
    tag('lowest',  esc(trafficData.lowest  || 'N/A'))
  );

  // ── Traffic chart data ───────────────────────────────────────────────────
  const trafficChartXml = tag('trafficChart',
    trafficChartData.map(d =>
      attrTag('day', { date: d.date, entrance: d.entrance ?? 0, exit: d.exit ?? 0 })
    ).join('\n    ')
  );

  // ── College / department distribution ────────────────────────────────────
  const collegeXml = tag('collegeDistribution',
    collegeData.map((c, i) =>
      tag('college', null, {
        no:           i + 1,
        name:         c.name,
        count:        c.count,
        totalStudents: c.totalStudents,
        percentage:   c.percentage,
      })
    ).join('\n    ')
  );

  // ── Authentication method breakdown ──────────────────────────────────────
  const methodXml = tag('authMethods',
    methodData.map((m, i) =>
      tag('method', null, {
        no:         i + 1,
        name:       m.name,
        count:      m.count,
        percentage: m.percentage,
        total:      m.total,
      })
    ).join('\n    ')
  );

  // ── Student log entries ──────────────────────────────────────────────────
  const logsXml = tag('studentLogs',
    studentLogs.map(l =>
      tag('entry', null, {
        no:         l.no,
        dateTime:   l.dateTime,
        studentId:  l.studentId,
        name:       l.name,
        department: l.department,
        program:    l.program   || 'N/A',
        yearLevel:  l.yearLevel || 'N/A',
        action:     l.action,
        method:     l.method,
        accuracy:   l.accuracy  || 'N/A',
      })
    ).join('\n    ')
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<eems-report>',
    '  ' + metaXml,
    '  ' + trafficSummaryXml,
    '  ' + trafficChartXml,
    '  ' + collegeXml,
    '  ' + methodXml,
    '  ' + logsXml,
    '</eems-report>',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// XML → JSON  (for re-importing or feeding into PDF renderer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an XML string (produced by reportToXml) back into a report data object.
 * Uses the browser's built-in DOMParser — no extra library needed.
 *
 * @param {string} xmlString
 * @returns {Object} report data object compatible with GenerateReportPdf
 */
export function xmlToReport(xmlString) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlString, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Invalid XML: ' + parseError.textContent);

  const getText  = (parent, selector) => parent.querySelector(selector)?.textContent?.trim() ?? '';
  const getNum   = (parent, selector) => Number(getText(parent, selector)) || 0;
  const getAttr  = (el, name)         => el.getAttribute(name) ?? '';
  const getNumA  = (el, name)         => Number(el.getAttribute(name)) || 0;

  // ── Meta ────────────────────────────────────────────────────────────────
  const meta = doc.querySelector('meta');
  const generatedAt   = getText(meta, 'generatedAt');
  const dateRange     = getText(meta, 'dateRange');
  const totalStudents = getNum(meta, 'totalStudents');
  const totalLogs     = getNum(meta, 'totalLogs');
  const filters = {
    from:       getText(meta, 'filters > from'),
    to:         getText(meta, 'filters > to'),
    department: getText(meta, 'filters > department'),
  };

  // ── Traffic summary ──────────────────────────────────────────────────────
  const ts = doc.querySelector('trafficSummary');
  const trafficData = {
    highest: getText(ts, 'highest'),
    lowest:  getText(ts, 'lowest'),
  };

  // ── Traffic chart ────────────────────────────────────────────────────────
  const trafficChartData = Array.from(doc.querySelectorAll('trafficChart > day')).map(el => ({
    date:     getAttr(el, 'date'),
    entrance: getNumA(el, 'entrance'),
    exit:     getNumA(el, 'exit'),
  }));

  // ── College distribution ─────────────────────────────────────────────────
  const collegeData = Array.from(doc.querySelectorAll('collegeDistribution > college')).map(el => ({
    name:          getAttr(el, 'name'),
    count:         getNumA(el, 'count'),
    totalStudents: getNumA(el, 'totalStudents'),
    percentage:    getNumA(el, 'percentage'),
  }));

  // ── Auth methods ─────────────────────────────────────────────────────────
  const methodData = Array.from(doc.querySelectorAll('authMethods > method')).map(el => ({
    name:       getAttr(el, 'name'),
    count:      getNumA(el, 'count'),
    percentage: getNumA(el, 'percentage'),
    total:      getNumA(el, 'total'),
  }));

  // ── Student logs ─────────────────────────────────────────────────────────
  const studentLogs = Array.from(doc.querySelectorAll('studentLogs > entry')).map(el => ({
    no:         getNumA(el, 'no'),
    dateTime:   getAttr(el, 'dateTime'),
    studentId:  getAttr(el, 'studentId'),
    name:       getAttr(el, 'name'),
    department: getAttr(el, 'department'),
    program:    getAttr(el, 'program'),
    yearLevel:  getAttr(el, 'yearLevel'),
    action:     getAttr(el, 'action'),
    method:     getAttr(el, 'method'),
    accuracy:   getAttr(el, 'accuracy'),
  }));

  return {
    generatedAt,
    dateRange,
    totalStudents,
    totalLogs,
    collegeData,
    methodData,
    trafficChartData,
    trafficData,
    studentLogs,
    filters,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XSLT TRANSFORMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply an XSLT transformation to an XML string.
 * Uses the browser's built-in XSLTProcessor API (supported in all modern browsers).
 *
 * @param {string} xmlString  - The XML content to transform
 * @param {string} xsltString - The XSLT stylesheet content
 * @returns {string}          - The transformed HTML string
 * @throws {Error}            - If XML or XSLT parsing fails
 */
export function applyXsltTransform(xmlString, xsltString) {
  try {
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    
    if (xmlDoc.querySelector('parsererror')) {
      throw new Error('Failed to parse XML: ' + xmlDoc.querySelector('parsererror').textContent);
    }

    // Parse XSLT
    const xsltDoc = parser.parseFromString(xsltString, 'application/xml');
    
    if (xsltDoc.querySelector('parsererror')) {
      throw new Error('Failed to parse XSLT: ' + xsltDoc.querySelector('parsererror').textContent);
    }

    // Create processor and apply transformation
    const processor = new XSLTProcessor();
    processor.importStylesheet(xsltDoc);
    const resultDoc = processor.transformToDocument(xmlDoc);

    // Serialize result to string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(resultDoc);
  } catch (err) {
    console.error('[xmlReportUtils.applyXsltTransform] Error:', err.message);
    throw err;
  }
}

/**
 * Transform XML report to HTML using the embedded XSLT stylesheet.
 * This is a convenience wrapper that fetches the XSLT and applies it.
 *
 * @param {string} xmlString - The XML content to transform
 * @returns {Promise<string>} - The transformed HTML string
 */
export async function xmlToHtml(xmlString) {
  try {
    // Fetch the XSLT stylesheet
    const xsltPath = new URL('eems-report.xslt', import.meta.url).href;
    const response = await fetch(xsltPath);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch XSLT: HTTP ${response.status}`);
    }
    
    const xsltString = await response.text();
    
    // Apply transformation
    return applyXsltTransform(xmlString, xsltString);
  } catch (err) {
    console.error('[xmlReportUtils.xmlToHtml] Error:', err.message);
    throw err;
  }
}

/**
 * Get the embedded XSLT stylesheet as a string.
 * Useful for inspection or manual transformation operations.
 *
 * @returns {Promise<string>} - The XSLT content
 */
export async function getXsltStylesheet() {
  try {
    const xsltPath = new URL('eems-report.xslt', import.meta.url).href;
    const response = await fetch(xsltPath);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch XSLT: HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (err) {
    console.error('[xmlReportUtils.getXsltStylesheet] Error:', err.message);
    throw err;
  }
}

/**
 * Transform XML to HTML and open in a new window for preview/printing.
 * Useful for PDF export workflows.
 *
 * @param {string} xmlString - The XML content to transform
 * @param {string} windowName - Optional window name (default: 'eems-report')
 */
export async function openXmlReportWindow(xmlString, windowName = 'eems-report') {
  try {
    const htmlString = await xmlToHtml(xmlString);
    const newWindow = window.open('', windowName, 'width=1000,height=800');
    newWindow.document.write(htmlString);
    newWindow.document.close();
  } catch (err) {
    console.error('[xmlReportUtils.openXmlReportWindow] Error:', err.message);
    alert('Failed to open report window. Check console for details.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger a browser download of the XML string as a .xml file.
 *
 * @param {string} xmlString
 * @param {string} filename  - e.g. "eems-report-2026-04-20.xml"
 */
export function downloadXml(xmlString, filename = 'eems-report.xml') {
  const blob = new Blob([xmlString], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Trigger a browser download of the HTML (transformed from XML via XSLT) as .html file.
 *
 * @param {string} htmlString
 * @param {string} filename  - e.g. "eems-report-2026-04-20.html"
 */
export function downloadHtml(htmlString, filename = 'eems-report.html') {
  const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}