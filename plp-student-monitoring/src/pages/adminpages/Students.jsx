// pages/adminpages/Students.jsx
import React, { useState, useEffect, useMemo } from "react";
import "../../css/Students.css";
import RegisterStudent from "../../components/RegisterStudent";
import ImportStudent   from "../../components/ImportStudents";
import EditStudent     from "../../components/EditStudent";
import axios from "axios";
import { FaUserGraduate } from "react-icons/fa";
import { BsPersonFillDash } from "react-icons/bs";
import { BsPersonFillSlash } from "react-icons/bs";

import { FiDownload, FiPlus, FiFilter, FiArchive } from "react-icons/fi";
import {
  BsPersonFillExclamation,
  BsPersonFillCheck,
  BsFillPeopleFill,
  BsPersonDash,
} from "react-icons/bs";
import { IoMdArrowDropdown } from "react-icons/io";
import { IoNotificationsCircleOutline } from "react-icons/io5";

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "Regular",     label: "Regular"     },
  { value: "Irregular",   label: "Irregular"   },
  { value: "LOA",         label: "LOA (Leave of Absence)" },
  { value: "Dropout",     label: "Dropout"     },
  { value: "Kickout",     label: "Kickout"     },
  { value: "Graduated",   label: "Graduated"   },
  { value: "Transferred", label: "Transferred" },
];

const ALL_STATUSES = [
  "Regular", "Irregular", "LOA", "Dropout", "Kickout", "Graduated", "Transferred", "Inactive",
];

// Which statuses count as "active / on-campus eligible"
const ACTIVE_STATUSES = ["Regular", "Irregular", "LOA"];

function statusBadgeClass(status) {
  if (!status) return "unknown";
  switch (status) {
    case "Regular":    return "regular";
    case "Irregular":  return "irregular";
    case "LOA":        return "loa";
    case "Dropout":    return "dropout";
    case "Kickout":    return "kickout";
    case "Graduated":  return "graduated";
    case "Transferred":return "transferred";
    case "Inactive":   return "inactive";
    default:           return "unknown";
  }
}

// ─── Batch-year helper ────────────────────────────────────────────────────────
// "23-00298"  →  "2023"
function batchYearFromId(studentId) {
  const prefix = studentId?.split("-")[0];
  if (!prefix || prefix.length !== 2) return null;
  return `20${prefix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Students() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [students,        setStudents]        = useState([]);
  const [faceStatusMap,   setFaceStatusMap]   = useState({});
  const [pendingFaceCount,setPendingFaceCount] = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  // ── Filter option lists (fetched from DB) ─────────────────────────────────
  const [deptOptions,    setDeptOptions]    = useState([]);   // [{id, dept_name}, ...]
  const [programOptions, setProgramOptions] = useState([]);   // [{id, programName, department}, ...]

  // ── Active filter values ──────────────────────────────────────────────────
  const [filterDept,       setFilterDept]       = useState("");
  const [filterProgram,    setFilterProgram]     = useState("");
  const [filterYearLevel,  setFilterYearLevel]   = useState("");
  const [filterBatchYear,  setFilterBatchYear]   = useState("");
  const [filterStatus,     setFilterStatus]      = useState("");
  const [filterFaceStatus, setFilterFaceStatus]  = useState(""); // "" | "registered" | "missing"
  const [searchQuery,      setSearchQuery]       = useState("");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showImportModal,   setShowImportModal]   = useState(false);
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [editingStudent,    setEditingStudent]    = useState(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage,   setCurrentPage]   = useState(1);
  const recordsPerPage = 10;

  // ── Sorting ────────────────────────────────────────────────────────────────
  const [sortColumn, setSortColumn] = useState("last_name"); // Default sort by last name
  const [sortDirection, setSortDirection] = useState("asc");

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedStudents, setSelectedStudents] = useState(new Set());

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/students");
      setStudents(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      setError(
        err.code === "ERR_NETWORK"
          ? "Cannot connect to server."
          : "Failed to load students."
      );
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaceStatus = async () => {
    try {
      const res = await axios.get("/api/students-face-status");
      setFaceStatusMap(res.data || {});
    } catch { /* silent */ }
  };

  const fetchPendingFace = async () => {
    try {
      const res = await axios.get("/api/pending-face-registration");
      setPendingFaceCount(res.data.count || 0);
    } catch { /* silent */ }
  };

  const fetchFilterOptions = async () => {
    try {
      const [deptRes, progRes] = await Promise.all([
        fetch("/api/departments?status=Active"),
        fetch("/api/programs?programStatus=Active"),
      ]);
      const depts = await deptRes.json();
      const progs = await progRes.json();
      setDeptOptions(Array.isArray(depts) ? depts : []);
      setProgramOptions(Array.isArray(progs) ? progs : []);
    } catch (err) {
      console.error("[Students] filter options fetch error:", err);
    }
  };

  const refreshAll = () => {
    fetchStudents();
    fetchFaceStatus();
    fetchPendingFace();
  };

  useEffect(() => {
    refreshAll();
    fetchFilterOptions();
  }, []);

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setCurrentPage(1); }, [
    searchQuery, filterDept, filterProgram,
    filterYearLevel, filterBatchYear, filterStatus, filterFaceStatus,
  ]);

  // When department filter changes, clear the program filter
  useEffect(() => {
    setFilterProgram("");
  }, [filterDept]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────

  // Programs available under the currently selected department (for the filter)
  const programsForFilter = useMemo(() => {
    if (!filterDept) return programOptions;
    return programOptions.filter(p => p.department === filterDept);
  }, [filterDept, programOptions]);

  // Unique batch years extracted from loaded student IDs — sorted descending
  const batchYearOptions = useMemo(() => {
    const set = new Set(
      students.map(s => batchYearFromId(s.student_id)).filter(Boolean)
    );
    return [...set].sort((a, b) => b - a);
  }, [students]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       students.length,
    regular:     students.filter(s => s.status === "Regular").length,
    irregular:   students.filter(s => s.status === "Irregular").length,
    loa:         students.filter(s => s.status === "LOA").length,
    graduated:   students.filter(s => s.status === "Graduated").length,
    transferred: students.filter(s => s.status === "Transferred").length,
    withdrawn:   students.filter(s => s.status === "Dropout" || s.status === "Kickout").length,
    inactive:    students.filter(s => s.status === "Inactive").length,
  }), [students]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        s.first_name?.toLowerCase().includes(q)  ||
        s.last_name?.toLowerCase().includes(q)   ||
        s.student_id?.toLowerCase().includes(q);

      // Department
      const matchDept = !filterDept || s.college_department === filterDept;

      // Program
      const matchProg = !filterProgram || s.program_name === filterProgram;

      // Year level — stored as int, filter value is a string
      const matchYear = !filterYearLevel || String(s.year_level) === filterYearLevel;

      // Batch year — first two chars of student_id
      const matchBatch = !filterBatchYear || batchYearFromId(s.student_id) === filterBatchYear;

      // Status
      const matchStatus = !filterStatus || s.status === filterStatus;

      // Face registration
      const hasFace = faceStatusMap[s.student_id] === true;
      const matchFace =
        !filterFaceStatus ||
        (filterFaceStatus === "registered" &&  hasFace) ||
        (filterFaceStatus === "missing"    && !hasFace);

      return matchSearch && matchDept && matchProg && matchYear &&
             matchBatch && matchStatus && matchFace;
    });
  }, [
    students, searchQuery, filterDept, filterProgram,
    filterYearLevel, filterBatchYear, filterStatus, filterFaceStatus, faceStatusMap,
  ]);

  // ── Sorted and paginated list ──────────────────────────────────────────────
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents].sort((a, b) => {
      let aVal, bVal;
      
      switch(sortColumn) {
        case "last_name":
          aVal = `${a.last_name || ""} ${a.first_name || ""}`.toLowerCase();
          bVal = `${b.last_name || ""} ${b.first_name || ""}`.toLowerCase();
          break;
        case "first_name":
          aVal = a.first_name?.toLowerCase() || "";
          bVal = b.first_name?.toLowerCase() || "";
          break;
        case "student_id":
          aVal = a.student_id?.toLowerCase() || "";
          bVal = b.student_id?.toLowerCase() || "";
          break;
        case "college_department":
          aVal = a.college_department?.toLowerCase() || "";
          bVal = b.college_department?.toLowerCase() || "";
          break;
        case "program_name":
          aVal = a.program_name?.toLowerCase() || "";
          bVal = b.program_name?.toLowerCase() || "";
          break;
        case "status":
          aVal = a.status?.toLowerCase() || "";
          bVal = b.status?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredStudents, sortColumn, sortDirection]);

  // ── Paginated slice ───────────────────────────────────────────────────────
  const totalPages        = Math.max(1, Math.ceil(sortedStudents.length / recordsPerPage));
  const indexOfFirst      = (currentPage - 1) * recordsPerPage;
  const currentStudents   = sortedStudents.slice(indexOfFirst, indexOfFirst + recordsPerPage);

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const openModal  = () => { document.body.style.overflow = "hidden"; };
  const closeModal = () => { document.body.style.overflow = "unset"; };

  // ── Sort handler ───────────────────────────────────────────────────────────
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // ── Sort indicator ─────────────────────────────────────────────────────────
  const getSortIndicator = (column) => {
    if (sortColumn !== column) return " ⇅";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  // ── Checkbox handlers ──────────────────────────────────────────────────────
  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === currentStudents.length) {
      setSelectedStudents(new Set());
    } else {
      const newSelected = new Set(currentStudents.map(s => s.student_id));
      setSelectedStudents(newSelected);
    }
  };

  const handleAdd   = () => { openModal(); setShowRegisterModal(true); };
  const handleImport= () => { openModal(); setShowImportModal(true); };
  const handleEdit  = (student) => {
    setEditingStudent({ ...student, hasFace: faceStatusMap[student.student_id] === true });
    openModal();
    setShowEditModal(true);
  };

  const handleCloseRegister = () => { closeModal(); setShowRegisterModal(false); refreshAll(); };
  const handleCloseImport   = () => { closeModal(); setShowImportModal(false); };
  const handleImportSuccess = () => { refreshAll(); handleCloseImport(); };
  const handleCloseEdit     = () => {
    closeModal(); setShowEditModal(false); setEditingStudent(null); refreshAll();
  };

  // ── Bulk archive ──────────────────────────────────────────────────────────
  const ARCHIVABLE_STATUSES = ["LOA", "Dropout", "Kickout", "Graduated", "Transferred"];

  const handleArchiveByStatus = async (status) => {
    // Validate status
    if (!status || !ARCHIVABLE_STATUSES.includes(status)) {
      alert(`Invalid status: ${status}`);
      return;
    }

    const count = students.filter(s => s.status === status).length;
    if (count === 0) {
      alert(`No ${status} students to archive.`);
      return;
    }

    if (!window.confirm(`Archive all ${count} ${status} student${count > 1 ? "s" : ""}? Their original status will be preserved.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put("/api/students/archive-by-status", { status });
      
      // Immediately remove archived students from the local state for instant UI feedback
      setStudents(prevStudents => 
        prevStudents.filter(s => s.status !== status)
      );
      
      alert(res.data.message || `Archived ${count} students`);
      // Refresh all data from backend to ensure consistency
      refreshAll();
    } catch (err) {
      alert(`Archive failed: ${err.response?.data?.message || err.message}`);
      // Refresh on error to ensure UI is in sync with backend
      refreshAll();
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const formatFullName = (s) => {
    if (!s) return "";
    const mid = s.middle_name ? ` ${s.middle_name.charAt(0)}.` : "";
    const ext = s.extension_name ? ` ${s.extension_name}` : "";
    return `${s.last_name || ""}, ${s.first_name || ""}${mid}${ext}`.trim();
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    return new Date(d)
      .toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
      .replace(/\//g, "-");
  };

  // ── Pagination renderer ───────────────────────────────────────────────────
  const renderPageNumbers = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const addBtn = (i) => pages.push(
      <button key={i} className={`page-number ${currentPage === i ? "active" : ""}`}
        onClick={() => setCurrentPage(i)}>{i}</button>
    );
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) addBtn(i);
    } else {
      addBtn(1);
      let start = Math.max(2, currentPage - 1);
      let end   = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3)             end   = 4;
      if (currentPage >= totalPages - 2) start = totalPages - 3;
      if (start > 2) pages.push(<span key="e1" className="ellipsis">…</span>);
      for (let i = start; i <= end; i++) addBtn(i);
      if (end < totalPages - 1) pages.push(<span key="e2" className="ellipsis">…</span>);
      addBtn(totalPages);
    }
    return pages;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Page header ── */}
      <header className="header-card">
        <h1>STUDENT MANAGEMENT</h1>
        <p className="subtitle">Dashboard / Student Management</p>
      </header>
      <hr className="header-divider" />

      {/* ── Face registration notification ── */}
      {pendingFaceCount > 0 && (
        <section className="notification_box">
          <div className="notification_wrapper">
            <h3><IoNotificationsCircleOutline /></h3>
            <div className="notification-content">
              <p>
                <strong>Action Required:</strong>{" "}
                <strong>{pendingFaceCount}</strong> student{pendingFaceCount !== 1 && "s"} need
                {pendingFaceCount === 1 ? "s" : ""} face registration.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Stat cards ── */}
      <div className="stats-container">
        <div className="stat-card all-students">
          <div className="stat-icon"><BsFillPeopleFill /></div>
          <div className="stat-details">
            <h3>All Students</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
        </div>
        <div className="stat-card regular-students">
          <div className="stat-icon"><BsPersonFillCheck /></div>
          <div className="stat-details">
            <h3>Regular</h3>
            <p className="stat-number">{stats.regular}</p>
          </div>
        </div>
        <div className="stat-card irregular-students">
          <div className="stat-icon"><BsPersonFillExclamation /></div>
          <div className="stat-details">
            <h3>Irregular</h3>
            <p className="stat-number">{stats.irregular}</p>
          </div>
        </div>
        <div className="stat-card loa-students">
          <div className="stat-icon"><BsPersonFillSlash />
</div>
          <div className="stat-details">
            <h3>On Leave (LOA)</h3>
            <p className="stat-number">{stats.loa}</p>
          </div>
        </div>
        <div className="stat-card graduated-students">
          <div className="stat-icon"><FaUserGraduate /></div>
          <div className="stat-details">
            <h3>Graduated</h3>
            <p className="stat-number">{stats.graduated}</p>
          </div>
        </div>
        <div className="stat-card withdrawn-students">
          <div className="stat-icon"><BsPersonFillDash /></div>
          <div className="stat-details">
            <h3>Withdrawn</h3>
            <p className="stat-number">{stats.withdrawn}</p>
            <p className="stat-sub">Dropout + Kickout</p>
          </div>
        </div>
      </div>

      <div className="student-management">

        {/* ── Controls row ── */}
        <div className="controls">
          {/* Department — dynamic from DB */}
          <select
            className="filter-select"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {deptOptions.map(d => (
              <option key={d.id} value={d.dept_name}>{d.dept_name}</option>
            ))}
          </select>

          {/* Program — dynamic, filtered by selected dept */}
          <select
            className="filter-select"
            value={filterProgram}
            onChange={e => setFilterProgram(e.target.value)}
            disabled={programsForFilter.length === 0}
          >
            <option value="">All Programs</option>
            {programsForFilter.map(p => (
              <option key={p.id} value={p.programName}>
                {p.programName} ({p.programCode})
              </option>
            ))}
          </select>

          {/* Year Level */}
          <select
            className="filter-select"
            value={filterYearLevel}
            onChange={e => setFilterYearLevel(e.target.value)}
          >
            <option value="">All Year Levels</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {/* Batch Year — dynamic from student IDs in DB */}
          <select
            className="filter-select"
            value={filterBatchYear}
            onChange={e => setFilterBatchYear(e.target.value)}
          >
            <option value="">All Batches</option>
            {batchYearOptions.map(y => (
              <option key={y} value={y}>Batch {y}</option>
            ))}
          </select>

          {/* Status */}
          <select
            className="filter-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Face Registration Status */}
          <select
            className="filter-select"
            value={filterFaceStatus}
            onChange={e => setFilterFaceStatus(e.target.value)}
          >
            <option value="">All Face Status</option>
            <option value="registered">Face Registered</option>
            <option value="missing">Face Not Registered</option>
          </select>

          {/* Search */}
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or ID…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          {/* Action buttons */}
          <button className="action-button import-button" onClick={handleImport}>
            <FiDownload className="button-icon" /> Import
          </button>
          <button className="action-button add-button" onClick={handleAdd}>
            <FiPlus className="button-icon" /> Add
          </button>
        </div>

        {/* ── Archive buttons section ── */}
        <div className="archive-buttons-section">
          <h4 className="archive-section-title">Archive Students by Status:</h4>
          <div className="archive-buttons-group">
            <button className="action-button archive-button" onClick={() => handleArchiveByStatus("LOA")}>
              <FiArchive className="button-icon" /> Archive all LOA students
            </button>
            <button className="action-button archive-button" onClick={() => handleArchiveByStatus("Dropout")}>
              <FiArchive className="button-icon" /> Archive all Dropout students
            </button>
            <button className="action-button archive-button" onClick={() => handleArchiveByStatus("Kickout")}>
              <FiArchive className="button-icon" /> Archive all Kickout students
            </button>
            <button className="action-button archive-button" onClick={() => handleArchiveByStatus("Graduated")}>
              <FiArchive className="button-icon" /> Archive all Graduated students
            </button>
            <button className="action-button archive-button" onClick={() => handleArchiveByStatus("Transferred")}>
              <FiArchive className="button-icon" /> Archive all Transferred students
            </button>
          </div>
        </div>

        {/* ── Face legend ── */}
        <div className="face-legend">
          <span className="face-legend-title">Face Registration:</span>
          <span className="face-legend-item">
            <span className="face-dot face-dot-registered" /> Registered
          </span>
          <span className="face-legend-item">
            <span className="face-dot face-dot-missing" /> Not registered
          </span>
        </div>

        {/* ── Table ── */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">Loading students…</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : (
            <table className="student-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === currentStudents.length && currentStudents.length > 0}
                      onChange={handleSelectAll}
                      title="Select all on this page"
                    />
                  </th>
                  <th>No.</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("student_id")}>
                    Student ID{getSortIndicator("student_id")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("last_name")}>
                    Full Name{getSortIndicator("last_name")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("college_department")}>
                    Department{getSortIndicator("college_department")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("program_name")}>
                    Program{getSortIndicator("program_name")}
                  </th>
                  <th>Year Level</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>
                    Status{getSortIndicator("status")}
                  </th>
                  <th>Date Registered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.length > 0 ? currentStudents.map((s, idx) => {
                  const hasFace = faceStatusMap[s.student_id] === true;
                  return (
                    <tr key={s.student_id}>
                      <td style={{ width: "40px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(s.student_id)}
                          onChange={() => handleSelectStudent(s.student_id)}
                        />
                      </td>
                      <td>{indexOfFirst + idx + 1}</td>
                      <td>
                        <div className="student-id-cell">
                          <span>{s.student_id}</span>
                          <span
                            className={`face-dot ${hasFace ? "face-dot-registered" : "face-dot-missing"}`}
                            title={hasFace ? "Face registered" : "Face not registered"}
                          />
                        </div>
                      </td>
                      <td>{formatFullName(s)}</td>
                      <td>{s.college_department || "—"}</td>
                      <td className="program-cell" title={s.program_name || ""}>
                        {s.program_name || "—"}
                      </td>
                      <td>{s.year_level ? `${s.year_level}` : "—"}</td>
                      <td>
                        <span className={`status-badge ${statusBadgeClass(s.status)}`}>
                          {s.status || "Unknown"}
                        </span>
                      </td>
                      <td>{formatDate(s.created_at)}</td>
                      <td className="action-cell">
                        <button
                          className="action-text-btn edit-text-btn"
                          onClick={() => handleEdit(s)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={10} className="no-data">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && !error && sortedStudents.length > 0 && (
          <>
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >← Previous</button>
              <div className="page-numbers">{renderPageNumbers()}</div>
              <button
                className="pagination-button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >Next →</button>
            </div>
            <div className="results-count">
              Showing {indexOfFirst + 1}–{Math.min(indexOfFirst + recordsPerPage, sortedStudents.length)} of {sortedStudents.length} students
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <RegisterStudent onClose={handleCloseRegister} onSuccess={fetchStudents} />
          </div>
        </div>
      )}
      {showImportModal && (
        <ImportStudent
          isOpen={showImportModal}
          onClose={handleCloseImport}
          onSuccess={handleImportSuccess}
        />
      )}
      {showEditModal && editingStudent && (
        <EditStudent student={editingStudent} onClose={handleCloseEdit} />
      )}
    </div>
  );
}

export default Students;