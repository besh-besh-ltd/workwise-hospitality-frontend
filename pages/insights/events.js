import React, { useState } from 'react';
import { 
  Calendar,
  MapPin,
  Users,
  Mail
} from 'lucide-react';

// Import reusable components
import { Button } from '@/components/ui/Button';
import { CtaSection } from '@/components/ui/CtaSection';
import { Dropdown } from '@/components/ui/Dropdown';
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';

// Import data
import { eventsData } from '@/components/constants/eventsData';

const EventsPage = () => {
  const [eventType, setEventType] = useState('All Events');
  const [status, setStatus] = useState('All Status');
  const [location, setLocation] = useState('All Locations');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleRegisterInterest = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleFormSubmit = async (formData) => {
    console.log('Event registration form submitted:', { event: selectedEvent, formData });
    // Here you would typically send the data to your backend
    // For now, we'll just log it
  };

  const handleGetUpdates = () => {
    console.log('Get Event Updates clicked');
  };

  // Filter events based on selected filters
  const filteredEvents = eventsData.events.filter(event => {
    const matchesType = eventType === 'All Events' || 
      (eventType === 'Exhibitions' && event.role === 'Exhibitor') ||
      (eventType === 'Conferences' && event.role === 'Speaker') ||
      (eventType === 'Trade Shows' && event.role === 'Sponsor') ||
      (eventType === 'Seminars' && event.role === 'Delegate');
    const matchesStatus = status === 'All Status' || event.status === status;
    const matchesLocation = location === 'All Locations' || event.location === location;
    return matchesType && matchesStatus && matchesLocation;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Upcoming':
        return 'bg-success';
      case 'Past':
        return 'bg-secondary';
      default:
        return 'bg-primary';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Exhibitor':
        return '🏢';
      case 'Speaker':
        return '🎤';
      case 'Sponsor':
        return '🏆';
      case 'Delegate':
        return '👥';
      default:
        return '📋';
    }
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Hero Section */}
      <section
        className="py-5"
        style={{
          background: 'linear-gradient(135deg, var(--primary-color) 0%, #428B41 100%)',
          paddingTop: '160px',
          paddingBottom: '60px'
        }}
      >
        <div className="container">
          <div className="row">
            <div className="col-lg-10">
              {/* Title */}
              <h1 className="fs-2 fw-bold text-white mb-3 text-start">
                {eventsData.hero.title}
              </h1>

              {/* Description */}
              <p className="text-white mb-4 text-start" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                {eventsData.hero.subtitle}
              </p>

              {/* Filters */}
              <div className="row g-3">
                <div className="col-md-4">
                  <Dropdown
                    label={eventsData.filters.eventType.label}
                    options={eventsData.filters.eventType.options}
                    value={eventType}
                    onChange={setEventType}
                  />
                </div>
                <div className="col-md-4">
                  <Dropdown
                    label={eventsData.filters.status.label}
                    options={eventsData.filters.status.options}
                    value={status}
                    onChange={setStatus}
                  />
                </div>
                <div className="col-md-4">
                  <Dropdown
                    label={eventsData.filters.location.label}
                    options={eventsData.filters.location.options}
                    value={location}
                    onChange={setLocation}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row g-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="col-md-6 col-lg-4">
                <EventCard
                  event={event}
                  onRegisterInterest={() => handleRegisterInterest(event)}
                  getStatusColor={getStatusColor}
                  getRoleIcon={getRoleIcon}
                />
              </div>
            ))}
          </div>

          {/* No Events Message */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-5">
              <div className="mb-3">
                <Calendar className="text-muted" size={48} />
              </div>
              <h5 className="text-muted">No events found</h5>
              <p className="text-muted">Try adjusting your filters to see more events.</p>
            </div>
          )}
        </div>
      </section>

      {/* Final CTA Section */}
      <CtaSection
        title={eventsData.finalCta.title}
        primaryButton={{
          ...eventsData.finalCta.button,
          onClick: handleGetUpdates
        }}
      />

      {/* Register Interest Modal */}
      <RegisterFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Register Your Interest"
        subtitle={selectedEvent ? `Event: ${selectedEvent.name}` : null}
        fields={[
          {
            name: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter your full name'
          },
          {
            name: 'companyName',
            label: 'Company Name',
            type: 'text',
            required: false,
            placeholder: 'Enter your company name'
          },
          {
            name: 'workEmail',
            label: 'Work Email',
            type: 'email',
            required: true,
            placeholder: 'Enter your work email'
          },
          {
            name: 'phoneNumber',
            label: 'Phone Number',
            type: 'tel',
            required: true,
            placeholder: 'Enter your phone number'
          },
          {
            name: 'keepUpdated',
            label: 'Keep me updated on future Workwise events',
            type: 'checkbox',
            required: false
          }
        ]}
        onSubmit={handleFormSubmit}
        successMessage="Thanks! You'll hear from our team soon."
      />
    </div>
  );
};

// Event Card Component
const EventCard = ({ event, onRegisterInterest, getStatusColor, getRoleIcon }) => {
  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-body p-4">
        {/* Event Image Placeholder */}
        <div 
          className="mb-3 rounded"
          style={{
            height: '120px',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #dee2e6'
          }}
        >
          <div className="text-center text-muted">
            <Calendar size={32} />
            <div className="small mt-1">Event Image</div>
          </div>
        </div>

        {/* Event Name */}
        <h5 className="card-title fw-bold text-dark mb-2" style={{ fontSize: '1.1rem' }}>
          {event.name}
        </h5>

        {/* Date */}
        <div className="d-flex align-items-center mb-2">
          <Calendar className="text-muted me-2" size={14} />
          <span className="text-muted small" style={{ fontSize: '0.85rem' }}>
            {event.date}
          </span>
        </div>

        {/* Location */}
        <div className="d-flex align-items-center mb-2">
          <MapPin className="text-muted me-2" size={14} />
          <span className="text-muted small" style={{ fontSize: '0.85rem' }}>
            {event.location} • {event.venue}
          </span>
        </div>

        {/* Role */}
        <div className="d-flex align-items-center mb-3">
          <Users className="text-muted me-2" size={14} />
          <span className="text-muted small" style={{ fontSize: '0.85rem' }}>
            Workwise Role: {event.role}
          </span>
          <span className="ms-2" style={{ fontSize: '1rem' }}>
            {getRoleIcon(event.role)}
          </span>
        </div>

        {/* Description */}
        <p className="text-muted mb-3" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {event.description}
        </p>

        {/* Status Tag */}
        <div className="mb-3">
          <span className={`badge ${getStatusColor(event.status)} text-white`} style={{ fontSize: '0.75rem' }}>
            {event.status}
          </span>
        </div>

        {/* Register Interest Button */}
        <button
          className="btn w-100"
          onClick={onRegisterInterest}
          style={{ 
            backgroundColor: '#0d6efd', 
            borderColor: '#0d6efd',
            color: 'white',
            transition: 'none',
            fontSize: '0.85rem',
            padding: '8px 12px',
            borderRadius: '6px'
          }}
        >
          Register Your Interest
        </button>
      </div>
    </div>
  );
};

export default EventsPage; 