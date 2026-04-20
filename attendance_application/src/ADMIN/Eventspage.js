import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Badge, Modal } from 'react-bootstrap';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventTypes,
  getLocations
} from '../api';
import './ccs/event.css';
import InfoTooltip from "../components/InfoTooltip";

function EventsPage({ onNavigate }) {

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('All Events');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const [loadError, setLoadError] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  const [newEvent, setNewEvent] = useState({
    event_name: '',
    eventtype_ID: '',
    location_ID: '',
    event_date: '',
    event_time: '',
    time_end: '',
    description: '',
    scan_mode: 'check_in'
  });



  useEffect(() => {
    loadEvents();
    loadEventTypes();
    loadLocations();
  }, []);

  const loadEvents = async () => {
    try {
      setLoadError('');
      const data = await getEvents({ archived: 0 });
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setEvents(list);
    } catch (err) {
      console.error('Failed to load events:', err);
      setEvents([]);
      setLoadError('Unable to load events. Please check your server/API for "events.php".');
    }
  };

  const loadEventTypes = async () => {
    try {
      const data = await getEventTypes();
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setEventTypes(list);
    } catch (err) {
      console.error('Failed to load event types:', err);
      setEventTypes([]);
      setLoadError(prev => prev || 'Unable to load event types. Please check "eventtype.php".');
    }
  };

  const loadLocations = async () => {
    try {
      const data = await getLocations();
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setLocations(list);
    } catch (err) {
      console.error('Failed to load locations:', err);
      setLocations([]);
      setLoadError(prev => prev || 'Unable to load locations. Please check "location.php".');
    }
  };



  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewEvent({
      event_name: '',
      eventtype_ID: '',
      location_ID: '',
      event_date: '',
      event_time: '',
      time_end: '',
      description: '',
      scan_mode: 'check_in'
    });
    setShowCreateModal(true);
  };

  const openEditModal = (ev) => {
    setIsEditing(true);
    setEditingId(ev.event_ID);

  
    const extractDate = (str) => {
      if (!str) return '';
      return str.split(' ')[0]; 
    };

    const extractTime = (str) => {
      if (!str || str.includes('0000-00-00')) return '';
      if (str.includes(' ')) return str.split(' ')[1].substring(0, 5);
      return str.substring(0, 5);
    };

    setNewEvent({
      event_name: ev.event_name || '',
      eventtype_ID: ev.eventtype_ID || '',
      location_ID: ev.location_ID || '',
      event_date: extractDate(ev.event_date) || '',
      event_time: extractTime(ev.event_time) || '',
      time_end: extractTime(ev.time_end) || '',
      description: ev.description || '',
      scan_mode: ev.scan_mode || 'check_in'
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');


    const selectedDate = new Date(`${newEvent.event_date}T${newEvent.event_time || '00:00'}`);
    const now = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(newEvent.event_date);
    eventDay.setHours(0, 0, 0, 0);

    if (eventDay < today && !isEditing) {
      setCreateError('Cannot create an event in the past.');
      return;
    }

    try {
      setCreating(true);
      let res;

      if (isEditing && editingId) {
        res = await updateEvent(editingId, newEvent);
      } else {
        res = await createEvent(newEvent);
      }

      await loadEvents();
      closeCreateModal();
      setCreateSuccess(
        res?.message || (isEditing ? 'Event updated successfully' : 'Event created successfully')
      );
      setTimeout(() => setCreateSuccess(''), 4000);
    } catch (err) {
      const msg = err?.message || 'Failed to create event. Please check "events.php".';
      setCreateError(msg);
      setTimeout(() => setCreateError(''), 5000);
    } finally {
      setCreating(false);
    }
  };


  const askArchive = (ev, e) => {
    e.stopPropagation();
    setArchiveTarget(ev);
    setShowArchiveConfirm(true);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setShowArchiveConfirm(false);
    try {
      const res = await deleteEvent(archiveTarget.event_ID);
      await loadEvents();
      setCreateSuccess(res?.message || 'Event archived successfully');
      setTimeout(() => setCreateSuccess(''), 4000);
    } catch (err) {
      const msg = err?.message || 'Failed to archive event.';
      setCreateError(msg);
      setTimeout(() => setCreateError(''), 5000);
    } finally {
      setArchiveTarget(null);
    }
  };

  const cancelArchive = () => {
    setShowArchiveConfirm(false);
    setArchiveTarget(null);
  };



  const filteredEvents = events.filter(event => {
    const q = searchTerm.toLowerCase();

    const matchSearch =
      event.event_name?.toLowerCase().includes(q) ||
      event.eventtype_name?.toLowerCase().includes(q) ||
      event.description?.toLowerCase().includes(q);

    const matchType =
      selectedEventType === 'All Events' ||
      event.eventtype_name === selectedEventType;

    return matchSearch && matchType;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'Flag Ceremony': return 'success';
      case 'Training': return 'warning';
      case 'Meeting': return 'primary';
      case 'Seminar': return 'info';
      default: return 'secondary';
    }
  };

  const handleViewEvent = (event) => {
    onNavigate('eventDetails', event);
  };


  return (
    <div className="admin-page">

      <div className="page-header-section">
        <h1 className="page-title">Event Attendance</h1>
      </div>

      <Card className="content-card">
        <Card.Body>

          <div className="card-header-section">
            <div>
              <h5 className="card-title-main">Events & Attendance</h5>
              <p className="card-subtitle">
                Manage events and track employee attendance
              </p>
            </div>
            <Button className="create-event-btn" onClick={openCreateModal}>
              Create Event
            </Button>
          </div>

          {loadError && (
            <div className="alert alert-danger mb-3" role="alert">
              {loadError}
            </div>
          )}
          {createSuccess && (
            <div className="alert alert-success mb-3" role="alert">
              {createSuccess}
            </div>
          )}
          {createError && (
            <div className="alert alert-danger mb-3" role="alert">
              {createError}
            </div>
          )}

          {/* Search & Filter */}
          <Row className="mb-4">
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </Col>
            <Col md={6}>
              <Form.Select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="filter-select"
              >
                <option>All Events</option>
                {eventTypes.map(type => (
                  <option key={type.eventtype_ID}>
                    {type.eventtype_name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {/* Event List */}
          <div className="events-list">

            {filteredEvents.length > 0 ? filteredEvents.map((event) => (

              <Card
                key={event.event_ID}
                className="event-item-card"
                onClick={() => handleViewEvent(event)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Body className="d-flex align-items-center">

                  <div className="flex-grow-1">

                    <div className="d-flex align-items-center mb-2">
                      <Badge
                        bg={getTypeColor(event.eventtype_name)}
                        className="me-2"
                      >
                        {event.eventtype_name}
                      </Badge>
                      <Badge bg={Number(event.is_active) === 1 ? 'success' : 'secondary'} className="me-2">
                        {Number(event.is_active) === 1 ? 'Activated' : 'Deactivated'}
                      </Badge>
                      <h6 className="event-name mb-0 me-2">
                        {event.event_name}
                      </h6>
                    </div>

                    <p className="event-description mb-2">
                      {event.description}
                    </p>

                    <div className="event-meta">
                      <span className="meta-item">📅 {event.event_date}</span>
                      <span className="meta-item">🕐 {event.event_time} {event.time_end ? ` - ${event.time_end}` : ''}</span>
                      <span className="meta-item">📍 {event.location_name}</span>
                      <span className="meta-item">👥 Target: {Number(event.selected_count || 0)}</span>
                    </div>

                  </div>

                  <div className="event-attendance">
                    {(() => {
                      const attended = Number(event.attended_count || 0);
                      const notAttended =
                        event.not_attended_count !== undefined
                          ? Number(event.not_attended_count)
                          : (event.total_expected !== undefined
                              ? Math.max(0, Number(event.total_expected) - attended)
                              : 0);
                      const tooltipText = `Attended - ${attended} / Not Attended - ${notAttended}`;
                      return (
                        <>
                          <div className="attendance-number">{attended}</div>
                          <div className="attendance-label">Attended</div>
                          <InfoTooltip text={tooltipText} placement="left" />
                        </>
                      );
                    })()}
                  </div>

                  {/* Actions — distinct colours so they can't be confused */}
                  <div className="action-btn-group ms-3">
                    <Button
                      className="btn-event-edit"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(event);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      className="btn-event-archive"
                      size="sm"
                      onClick={(e) => askArchive(event, e)}
                    >
                      Archive
                    </Button>
                  </div>

                </Card.Body>
              </Card>

            )) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                No events found
              </div>
            )}

          </div>

        </Card.Body>
      </Card>

      {/* ================= CREATE / EDIT MODAL ================= */}
      <Modal
        show={showCreateModal}
        onHide={closeCreateModal}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton className="modal-header">
          <Modal.Title>{isEditing ? 'Edit Event' : 'Create New Event'}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmitCreate}>

            <Row className="g-3">

              <Col md={12}>
                <Form.Label>Event Name</Form.Label>
                <Form.Control
                  required
                  value={newEvent.event_name}
                  onChange={e =>
                    setNewEvent({ ...newEvent, event_name: e.target.value })
                  }
                />
              </Col>

              <Col md={6}>
                <Form.Label>Event Type</Form.Label>
                <Form.Select
                  required
                  value={newEvent.eventtype_ID}
                  onChange={e =>
                    setNewEvent({ ...newEvent, eventtype_ID: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {eventTypes.map(type => (
                    <option key={type.eventtype_ID} value={type.eventtype_ID}>
                      {type.eventtype_name}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={6}>
                <Form.Label>Location</Form.Label>
                <Form.Select
                  required
                  value={newEvent.location_ID}
                  onChange={e =>
                    setNewEvent({ ...newEvent, location_ID: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {locations.map(loc => (
                    <option key={loc.location_ID} value={loc.location_ID}>
                      {loc.location_name}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={6}>
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newEvent.event_date}
                  onChange={e =>
                    setNewEvent({ ...newEvent, event_date: e.target.value })
                  }
                />
              </Col>

              <Col md={6}>
                <Form.Label>Start Time</Form.Label>
                <Form.Control
                  type="time"
                  required
                  value={newEvent.event_time}
                  onChange={e =>
                    setNewEvent({ ...newEvent, event_time: e.target.value })
                  }
                />
              </Col>

              <Col md={6}>
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  value={newEvent.time_end}
                  onChange={e =>
                    setNewEvent({ ...newEvent, time_end: e.target.value })
                  }
                />
              </Col>

              <Col md={12}>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={newEvent.description}
                  onChange={e =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                />
              </Col>

            </Row>

            <div className="mt-4 text-end d-flex justify-content-end gap-2">
              <Button className="btn-modal-cancel" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button className="btn-modal-save" type="submit" disabled={creating}>
                {creating ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
              </Button>
            </div>

          </Form>
        </Modal.Body>
      </Modal>

      {/* ================= ARCHIVE CONFIRMATION MODAL ================= */}
      <Modal
        show={showArchiveConfirm}
        onHide={cancelArchive}
        centered
        size="sm"
        backdrop="static"
      >
        <Modal.Header closeButton className="modal-header">
          <Modal.Title style={{ fontSize: 16 }}>Archive Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
            Are you sure you want to archive{' '}
            <strong>{archiveTarget?.event_name}</strong>?
            It will be moved to the Events Archive.
          </p>
        </Modal.Body>
        <Modal.Footer style={{ border: '1px solid #f0f0f0', padding: '14px 24px', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button className="btn-modal-cancel" onClick={cancelArchive}>
            Cancel
          </Button>
          <Button className="btn-event-archive" onClick={confirmArchive}>
            Yes, Archive
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}

export default EventsPage;