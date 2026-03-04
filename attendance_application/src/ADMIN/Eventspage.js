import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Badge, Modal } from 'react-bootstrap';
import {
  getEvents,
  createEvent,
  getEventTypes,
  getLocations
} from '../api';
import './ccs/event.css';

function EventsPage({ onNavigate }) {

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('All Events');

  const [showCreateModal, setShowCreateModal] = useState(false);

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
    description: ''
  });

  // =========================================
  // LOAD DATA
  // =========================================

  useEffect(() => {
    loadEvents();
    loadEventTypes();
    loadLocations();
  }, []);

  const loadEvents = async () => {
    try {
      setLoadError('');
      const data = await getEvents();
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

  // =========================================
  // CREATE EVENT
  // =========================================

  const openCreateModal = () => {
    setNewEvent({
      event_name: '',
      eventtype_ID: '',
      location_ID: '',
      event_date: '',
      event_time: '',
      description: ''
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => setShowCreateModal(false);

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    try {
      setCreating(true);
      const res = await createEvent(newEvent);
      await loadEvents();
      closeCreateModal();
      setCreateSuccess(res?.message || 'Event created successfully');
      setTimeout(() => setCreateSuccess(''), 4000);
    } catch (err) {
      const msg = err?.message || 'Failed to create event. Please check "events.php".';
      setCreateError(msg);
      setTimeout(() => setCreateError(''), 5000);
    } finally {
      setCreating(false);
    }
  };

  // =========================================
  // FILTER
  // =========================================

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

  // =========================================
  // UI
  // =========================================

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

                      <h6 className="event-name mb-0 me-2">
                        {event.event_name}
                      </h6>

                    </div>

                    <p className="event-description mb-2">
                      {event.description}
                    </p>

                    <div className="event-meta">
                      <span className="meta-item">
                        {event.event_date}
                      </span>
                      <span className="meta-item">
                        {event.event_time}
                      </span>
                      <span className="meta-item">
                        {event.location_name}
                      </span>
                    </div>

                  </div>

                  <div className="event-attendance">
                    <div className="attendance-number">
                      {event.attended_count || 0}
                    </div>
                    <div className="attendance-label">Attended</div>
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

      {/* ================= MODAL ================= */}

      <Modal
        show={showCreateModal}
        onHide={closeCreateModal}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Event</Modal.Title>
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
                    <option
                      key={type.eventtype_ID}
                      value={type.eventtype_ID}
                    >
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
                    <option
                      key={loc.location_ID}
                      value={loc.location_ID}
                    >
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
                  value={newEvent.event_date}
                  onChange={e =>
                    setNewEvent({ ...newEvent, event_date: e.target.value })
                  }
                />
              </Col>

              <Col md={6}>
                <Form.Label>Time</Form.Label>
                <Form.Control
                  type="time"
                  required
                  value={newEvent.event_time}
                  onChange={e =>
                    setNewEvent({ ...newEvent, event_time: e.target.value })
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

            <div className="mt-4 text-end">
              <Button
                variant="secondary"
                onClick={closeCreateModal}
                className="me-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Event'}
              </Button>
            </div>

          </Form>
        </Modal.Body>

      </Modal>

    </div>
  );
}

export default EventsPage;
