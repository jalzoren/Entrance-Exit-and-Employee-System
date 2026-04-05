import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Badge, Modal } from 'react-bootstrap';
import {
  getEvents,
  getEventTypes,
  getLocations,
  restoreEvent
} from '../api';
import './ccs/archives.css';

function EventsArchive({ onNavigate }) {

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('All Events');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [selectedMonth, setSelectedMonth] = useState('All Months');

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // ── Confirmation modal state ──
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // event object to restore

  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // =========================================
  // LOAD DATA
  // =========================================

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      setLoadError('');
      const [eventsData, typesData] = await Promise.all([
        getEvents({ archived: 1 }),
        getEventTypes()
      ]);

      const eventList = Array.isArray(eventsData) ? eventsData : (eventsData?.data ?? []);
      const typeList = Array.isArray(typesData) ? typesData : (typesData?.data ?? []);

      setEvents(eventList);
      setEventTypes(typeList);
    } catch (err) {
      console.error('Failed to load archive:', err);
      setLoadError('Unable to load archived events. Please check your server/API.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Open confirmation modal instead of window.confirm ──
  const askRestore = (event, e) => {
    if (e) e.stopPropagation();
    setConfirmTarget(event);
    setShowConfirmModal(true);
  };

  const confirmRestore = async () => {
    if (!confirmTarget) return;
    setShowConfirmModal(false);
    setRestoring(true);
    try {
      await restoreEvent(confirmTarget.event_ID);
      setActionSuccess('Event restored successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
      loadAll();
      setShowDetailModal(false);
    } catch (err) {
      console.error('Failed to restore event:', err);
      setLoadError('Failed to restore event. Please try again.');
    } finally {
      setRestoring(false);
      setConfirmTarget(null);
    }
  };

  const cancelRestore = () => {
    setShowConfirmModal(false);
    setConfirmTarget(null);
  };

  // =========================================
  // FILTER HELPERS
  // =========================================

  const availableYears = [...new Set(
    events
      .filter(e => e.event_date)
      .map(e => new Date(e.event_date).getFullYear())
  )].sort((a, b) => b - a);

  const MONTHS = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  const filteredEvents = events.filter(event => {
    const q = searchTerm.toLowerCase();

    const matchSearch =
      event.event_name?.toLowerCase().includes(q) ||
      event.eventtype_name?.toLowerCase().includes(q) ||
      event.description?.toLowerCase().includes(q) ||
      event.location_name?.toLowerCase().includes(q);

    const matchType =
      selectedEventType === 'All Events' ||
      event.eventtype_name === selectedEventType;

    let matchYear = true;
    let matchMonth = true;

    if (event.event_date) {
      const d = new Date(event.event_date);
      if (selectedYear !== 'All Years') {
        matchYear = d.getFullYear() === parseInt(selectedYear);
      }
      if (selectedMonth !== 'All Months') {
        matchMonth = d.getMonth() === MONTHS.indexOf(selectedMonth);
      }
    }

    return matchSearch && matchType && matchYear && matchMonth;
  });

  // Group events by year for timeline view
  const groupedByYear = filteredEvents.reduce((acc, event) => {
    const year = event.event_date
      ? new Date(event.event_date).getFullYear()
      : 'Unknown';
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);

  // =========================================
  // BADGE / TYPE HELPERS
  // =========================================

  const getTypeColor = (type) => {
    switch (type) {
      case 'Flag Ceremony': return 'success';
      case 'Training': return 'warning';
      case 'Meeting': return 'primary';
      case 'Seminar': return 'info';
      default: return 'secondary';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const getAttendanceRate = (event) => {
    if (!event.total_employees || event.total_employees === 0) return null;
    const rate = Math.round((event.attended_count / event.total_employees) * 100);
    return rate;
  };

  const openDetail = (event) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  // =========================================
  // STATS
  // =========================================

  const totalArchived = events.length;
  const totalAttendances = events.reduce((s, e) => s + (e.attended_count || 0), 0);
  const typeBreakdown = eventTypes.map(t => ({
    name: t.eventtype_name,
    count: events.filter(e => e.eventtype_name === t.eventtype_name).length
  })).filter(t => t.count > 0);

  // =========================================
  // UI
  // =========================================

  return (
    <div className="archive-page">

      {/* ===== HEADER ===== */}
      <div className="archive-header-section">
        <div className="archive-title-block">
          <div className="archive-eyebrow">
            <span className="archive-eyebrow-dot" />
            Historical Records
          </div>
          <h1 className="archive-title">Events Archive</h1>
          <p className="archive-subtitle">
            Browse and review all past events and attendance records
          </p>
        </div>
        <Button className="back-btn" onClick={() => onNavigate('events')}>
          ← Back to Events
        </Button>
      </div>

      {/* ===== STAT STRIP ===== */}
      <div className="archive-stat-strip">
        <div className="archive-stat-item">
          <span className="archive-stat-value">{totalArchived}</span>
          <span className="archive-stat-label">Archived Events</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat-item">
          <span className="archive-stat-value">{totalAttendances.toLocaleString()}</span>
          <span className="archive-stat-label">Total Attendances</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat-item">
          <span className="archive-stat-value">{availableYears.length}</span>
          <span className="archive-stat-label">Years on Record</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat-item">
          <span className="archive-stat-value">{typeBreakdown.length}</span>
          <span className="archive-stat-label">Event Types</span>
        </div>
      </div>

      {/* ===== FILTERS CARD ===== */}
      <Card className="archive-filter-card">
        <Card.Body>
          <div className="archive-filter-header">
            <span className="archive-filter-title">🗂 Filter Archive</span>
            <div className="archive-view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Timeline view"
              >
                ☰ Timeline
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                ⊞ Grid
              </button>
            </div>
          </div>

          <Row className="g-3 mt-1">
            <Col md={4}>
              <Form.Control
                type="text"
                placeholder="Search events, type, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="archive-search-input"
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="archive-filter-select"
              >
                <option>All Events</option>
                {eventTypes.map(type => (
                  <option key={type.eventtype_ID}>{type.eventtype_name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="archive-filter-select"
              >
                <option>All Years</option>
                {availableYears.map(y => (
                  <option key={y}>{y}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="archive-filter-select"
              >
                <option>All Months</option>
                {MONTHS.map(m => (
                  <option key={m}>{m}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={1} className="d-flex align-items-center">
              <button
                className="archive-clear-btn"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedEventType('All Events');
                  setSelectedYear('All Years');
                  setSelectedMonth('All Months');
                }}
                title="Clear filters"
              >
                ✕ Clear
              </button>
            </Col>
          </Row>

          <div className="archive-result-count">
            Showing <strong>{filteredEvents.length}</strong> of <strong>{totalArchived}</strong> archived events
          </div>
        </Card.Body>
      </Card>

      {/* ===== ERRORS / SUCCESS ===== */}
      {loadError && (
        <div className="alert alert-danger mt-3" role="alert">{loadError}</div>
      )}
      {actionSuccess && (
        <div className="alert alert-success mt-3" role="alert">{actionSuccess}</div>
      )}

      {/* ===== LOADING ===== */}
      {loading && (
        <div className="archive-loading">
          <div className="archive-loading-spinner" />
          <span>Loading archive...</span>
        </div>
      )}

      {/* ===== EMPTY ===== */}
      {!loading && filteredEvents.length === 0 && (
        <div className="archive-empty">
          <div className="archive-empty-icon">📂</div>
          <div className="archive-empty-title">No archived events found</div>
          <div className="archive-empty-sub">Try adjusting your filters or search term</div>
        </div>
      )}

      {/* ===== TIMELINE VIEW ===== */}
      {!loading && filteredEvents.length > 0 && viewMode === 'list' && (
        <div className="archive-timeline">
          {sortedYears.map((year) => (
            <div key={year} className="archive-year-group">

              <div className="archive-year-label">
                <span className="archive-year-badge">{year}</span>
                <span className="archive-year-count">
                  {groupedByYear[year].length} event{groupedByYear[year].length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="archive-year-events">
                {groupedByYear[year]
                  .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
                  .map((event) => {
                    const rate = getAttendanceRate(event);
                    return (
                      <div
                        key={event.event_ID}
                        className="archive-event-row"
                        onClick={() => openDetail(event)}
                      >
                        <div className="archive-event-date-col">
                          <div className="archive-date-day">
                            {event.event_date
                              ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })
                              : '—'}
                          </div>
                          <div className="archive-date-num">
                            {event.event_date
                              ? new Date(event.event_date).getDate()
                              : ''}
                          </div>
                        </div>

                        <div className="archive-timeline-line">
                          <div className="archive-timeline-dot" />
                          <div className="archive-timeline-connector" />
                        </div>

                        <div className="archive-event-content">
                          <div className="archive-event-top">
                            <Badge bg={getTypeColor(event.eventtype_name)} className="archive-type-badge">
                              {event.eventtype_name || 'Event'}
                            </Badge>
                            <h6 className="archive-event-name">{event.event_name}</h6>
                          </div>
                          {event.description && (
                            <p className="archive-event-desc">{event.description}</p>
                          )}
                          <div className="archive-event-meta">
                            {event.event_time && (
                              <span className="archive-meta-chip">
                                🕐 {formatTime(event.event_time)}
                              </span>
                            )}
                            {event.location_name && (
                              <span className="archive-meta-chip">
                                📍 {event.location_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="archive-attendance-col">
                          <div className="archive-att-number">
                            {event.attended_count ?? 0}
                          </div>
                          <div className="archive-att-label">Attended</div>
                          {rate !== null && (
                            <div className={`archive-att-rate ${rate >= 75 ? 'good' : rate >= 50 ? 'ok' : 'low'}`}>
                              {rate}%
                            </div>
                          )}
                        </div>

                        <div className="archive-view-arrow ms-2">›</div>

                        <div className="ms-3">
                          <Button
                            className="btn-archive-restore"
                            size="sm"
                            onClick={(e) => askRestore(event, e)}
                            disabled={restoring}
                          >
                            Restore
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ===== GRID VIEW ===== */}
      {!loading && filteredEvents.length > 0 && viewMode === 'grid' && (
        <div className="archive-grid">
          {filteredEvents
            .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
            .map((event) => {
              const rate = getAttendanceRate(event);
              return (
                <div
                  key={event.event_ID}
                  className="archive-grid-card"
                  onClick={() => openDetail(event)}
                >
                  <div className="archive-grid-card-top">
                    <Badge bg={getTypeColor(event.eventtype_name)} className="archive-type-badge">
                      {event.eventtype_name || 'Event'}
                    </Badge>
                    <span className="archive-grid-date">
                      {formatDate(event.event_date)}
                    </span>
                  </div>

                  <h6 className="archive-grid-name">{event.event_name}</h6>

                  {event.description && (
                    <p className="archive-grid-desc">{event.description}</p>
                  )}

                  {/* ── Start & end time in grid ── */}
                  {(event.event_time || event.event_end_time) && (
                    <div className="archive-grid-time-row">
                      {event.event_time && (
                        <span className="archive-grid-time-chip">
                          🕐 Start: {formatTime(event.event_time)}
                        </span>
                      )}
                      {event.event_end_time && (
                        <span className="archive-grid-time-chip">
                          🕑 End: {formatTime(event.event_end_time)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="archive-grid-footer">
                    <div className="archive-grid-location">
                      {event.location_name && <span>📍 {event.location_name}</span>}
                    </div>
                    <div className="archive-grid-att">
                      <span className="archive-grid-att-num">{event.attended_count ?? 0}</span>
                      <span className="archive-grid-att-lbl">attended</span>
                    </div>
                  </div>

                  <div className="mt-2 text-end">
                    <Button
                      className="btn-archive-restore"
                      size="sm"
                      onClick={(e) => askRestore(event, e)}
                      disabled={restoring}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton className="archive-modal-header">
          <Modal.Title>
            {selectedEvent && (
              <div className="d-flex align-items-center gap-2">
                <Badge bg={getTypeColor(selectedEvent?.eventtype_name)}>
                  {selectedEvent?.eventtype_name}
                </Badge>
                {selectedEvent?.event_name}
              </div>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedEvent && (
            <div className="archive-detail-body">

              <div className="archive-detail-grid">
                <div className="archive-detail-item">
                  <span className="archive-detail-label">📅 Date</span>
                  <span className="archive-detail-value">{formatDate(selectedEvent.event_date)}</span>
                </div>
                <div className="archive-detail-item">
                  <span className="archive-detail-label">🕐 Start Time</span>
                  <span className="archive-detail-value">{formatTime(selectedEvent.event_time)}</span>
                </div>
                {selectedEvent.event_end_time && (
                  <div className="archive-detail-item">
                    <span className="archive-detail-label">🕑 End Time</span>
                    <span className="archive-detail-value">{formatTime(selectedEvent.event_end_time)}</span>
                  </div>
                )}
                <div className="archive-detail-item">
                  <span className="archive-detail-label">📍 Location</span>
                  <span className="archive-detail-value">{selectedEvent.location_name || '—'}</span>
                </div>
                <div className="archive-detail-item">
                  <span className="archive-detail-label">👥 Attended</span>
                  <span className="archive-detail-value highlight">
                    {selectedEvent.attended_count ?? 0}
                    {selectedEvent.total_employees
                      ? ` / ${selectedEvent.total_employees}`
                      : ''}
                  </span>
                </div>
              </div>

              {getAttendanceRate(selectedEvent) !== null && (
                <div className="archive-detail-rate-bar">
                  <div className="archive-rate-label">
                    Attendance Rate
                    <strong> {getAttendanceRate(selectedEvent)}%</strong>
                  </div>
                  <div className="archive-rate-track">
                    <div
                      className={`archive-rate-fill ${
                        getAttendanceRate(selectedEvent) >= 75 ? 'good'
                        : getAttendanceRate(selectedEvent) >= 50 ? 'ok' : 'low'
                      }`}
                      style={{ width: `${getAttendanceRate(selectedEvent)}%` }}
                    />
                  </div>
                </div>
              )}

              {selectedEvent.description && (
                <div className="archive-detail-desc">
                  <div className="archive-detail-label">📝 Description</div>
                  <p>{selectedEvent.description}</p>
                </div>
              )}

            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="archive-modal-footer">
          <Button
            className="btn-modal-cancel"
            onClick={() => setShowDetailModal(false)}
          >
            Close
          </Button>
          {selectedEvent && (
            <>
              <Button
                className="btn-archive-restore"
                onClick={(e) => askRestore(selectedEvent, e)}
                disabled={restoring}
              >
                {restoring ? 'Restoring...' : 'Restore Event'}
              </Button>
              <Button
                className="btn-modal-save"
                onClick={() => {
                  setShowDetailModal(false);
                  onNavigate('eventDetails', selectedEvent);
                }}
              >
                View Full Details →
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* ===== RESTORE CONFIRMATION MODAL ===== */}
      <Modal
        show={showConfirmModal}
        onHide={cancelRestore}
        centered
        size="sm"
        backdrop="static"
      >
        <Modal.Header closeButton className="archive-modal-header">
          <Modal.Title style={{ fontSize: 16 }}>Restore Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
            Are you sure you want to restore{' '}
            <strong>{confirmTarget?.event_name}</strong> to the active events list?
          </p>
        </Modal.Body>
        <Modal.Footer className="archive-modal-footer">
          <Button className="btn-modal-cancel" onClick={cancelRestore}>
            Cancel
          </Button>
          <Button className="btn-archive-restore" onClick={confirmRestore}>
            Yes, Restore
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}

export default EventsArchive;