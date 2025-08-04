import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  MapPin,
  Search,
  Clock,
  Handshake
} from 'lucide-react';

// Import reusable components
import { Button } from '@/components/ui/Button';
import { CtaSection } from '@/components/ui/CtaSection';
import { Dropdown } from '@/components/ui/Dropdown';
import { SearchBar } from '@/components/ui/SearchBar';
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';

// Import data
import { eventsData } from '@/components/constants/eventsData';

const EventsPage = () => {
  const [eventType, setEventType] = useState('All Events');
  const [location, setLocation] = useState('All Locations');
  const [participationType, setParticipationType] = useState('All Participation Type');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleRegisterInterest = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleViewHighlights = (event) => {
    console.log('View highlights for event:', event);
    // Here you would typically navigate to event highlights page
  };

  const handleFormSubmit = async (formData) => {
    console.log('Event registration form submitted:', { event: selectedEvent, formData });
    // Here you would typically send the data to your backend
    setShowModal(false);
  };

  const handleGetUpdates = () => {
    setSelectedEvent(null);
    setShowModal(true);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  // Filter events based on selected filters and search term
  const filteredEvents = eventsData.events.filter(event => {
    const matchesType = eventType === 'All Events' || 
      (eventType === 'Exhibitions' && event.participationTypes.includes('Exhibitor')) ||
      (eventType === 'Conferences' && event.participationTypes.includes('Speaker')) ||
      (eventType === 'Trade Shows' && event.participationTypes.includes('Sponsor')) ||
      (eventType === 'Seminars' && event.participationTypes.includes('Delegate'));
    
    const matchesLocation = location === 'All Locations' || event.location === location;
    
    const matchesParticipation = participationType === 'All Participation Type' || 
      event.participationTypes.includes(participationType);
    
    const matchesSearch = searchTerm === '' || 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesLocation && matchesParticipation && matchesSearch;
  });

  // Separate upcoming and past events
  const upcomingEvents = filteredEvents.filter(event => event.status === 'Upcoming');
  const pastEvents = filteredEvents.filter(event => event.status === 'Past');

  const getParticipationTypeColor = (type) => {
    switch (type) {
      case 'Exhibitor':
        return { bg: '#e3f2fd', text: '#1976d2' };
      case 'Sponsor':
        return { bg: '#e8f5e8', text: '#2e7d32' };
      case 'Speaker':
        return { bg: '#f3e5f5', text: '#7b1fa2' };
      case 'Delegate':
        return { bg: '#fff3e0', text: '#f57c00' };
      default:
        return { bg: '#f5f5f5', text: '#616161' };
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
              {/* Title with icon */}
              <div className="d-flex align-items-center mb-3">
                <h1 className="fs-2 fw-bold text-white mb-0">
                  {eventsData.hero.title}
                </h1>
              </div>

              {/* Description */}
              <p className="text-white mb-0" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                {eventsData.hero.subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Bar */}
      <section className="py-4 bg-white">
        <div className="container">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <Dropdown
                label=""
                options={eventsData.filters.eventType.options}
                value={eventType}
                onChange={setEventType}
                placeholder="All Events"
              />
            </div>
            <div className="col-md-3">
              <Dropdown
                label=""
                options={eventsData.filters.location.options}
                value={location}
                onChange={setLocation}
                placeholder="All Locations"
              />
            </div>
            <div className="col-md-3">
              <Dropdown
                label=""
                options={eventsData.filters.participationType.options}
                value={participationType}
                onChange={setParticipationType}
                placeholder="All Participation Type"
              />
            </div>
            <div className="col-md-3">
              <SearchBar
                placeholder="Search events..."
                onSearch={handleSearch}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-5 bg-white">
        <div className="container">
          {/* Section Header */}
          <div className="d-flex align-items-center mb-4">
            <h2 className="fs-3 fw-bold text-dark mb-0">Upcoming Events</h2>
          </div>

          {/* Events Grid */}
          {upcomingEvents.length > 0 ? (
            <div className="row g-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="col-md-6 col-lg-4">
                  <EventCard
                    event={event}
                    onRegisterInterest={() => handleRegisterInterest(event)}
                    getParticipationTypeColor={getParticipationTypeColor}
                    isUpcoming={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <Calendar className="text-muted" size={48} />
              </div>
              <h5 className="text-muted">No upcoming events found</h5>
              <p className="text-muted">Try adjusting your filters to see more events.</p>
            </div>
          )}
        </div>
      </section>

      {/* Past Events Section */}
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          {/* Section Header */}
          <div className="d-flex align-items-center mb-4">
            
            <h2 className="fs-3 fw-bold text-dark mb-0">Past Events</h2>
          </div>

          {/* Events Grid */}
          {pastEvents.length > 0 ? (
            <div className="row g-4">
              {pastEvents.map((event) => (
                <div key={event.id} className="col-md-6 col-lg-4">
                  <EventCard
                    event={event}
                    onViewHighlights={() => handleViewHighlights(event)}
                    getParticipationTypeColor={getParticipationTypeColor}
                    isUpcoming={false}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <Clock className="text-muted" size={48} />
              </div>
              <h5 className="text-muted">No past events found</h5>
              <p className="text-muted">Try adjusting your filters to see more events.</p>
            </div>
          )}
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        className="py-5"
        style={{
          background: 'linear-gradient(135deg, var(--primary-color) 0%, #428B41 100%)'
        }}
      >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <h2 className="fs-3 fw-bold text-white mb-0">
                  {eventsData.finalCta.title}
                </h2>
              </div>
              <p className="text-white mb-4" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                {eventsData.finalCta.subtitle}
              </p>
              <button
                className="btn btn-light px-4 py-2 fw-semibold"
                onClick={handleGetUpdates}
                style={{
                  backgroundColor: 'white',
                  border: 'none',
                  color: 'var(--primary-color)',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              >
                {eventsData.finalCta.button.label}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Register Interest Modal */}
      <RegisterFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={selectedEvent ? "Register Your Interest" : "Get Event Updates"}
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
const EventCard = ({ event, onRegisterInterest, onViewHighlights, getParticipationTypeColor, isUpcoming }) => {
  return (
    <div className="card h-100 shadow-sm border-0" style={{ borderRadius: '8px', overflow: 'hidden' }}>
      {/* Event Image */}
      <div 
        className="position-relative"
        style={{
          height: '200px',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #dee2e6'
        }}
      >
        <div className="text-center text-muted">
          <Calendar size={48} />
          <div className="small mt-2">Event Image</div>
        </div>
        
        {/* Status Tag */}
        <div 
          className="position-absolute"
          style={{
            top: '12px',
            right: '12px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: isUpcoming ? '#ff9800' : '#6c757d',
            color: 'white'
          }}
        >
          {isUpcoming ? 'Upcoming' : 'Past'}
        </div>
      </div>

      <div className="card-body p-4">
        {/* Event Name */}
        <h5 className="card-title fw-bold text-dark mb-3" style={{ fontSize: '1.1rem', lineHeight: '1.3' }}>
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
        <div className="d-flex align-items-center mb-3">
          <MapPin className="text-muted me-2" size={14} />
          <span className="text-muted small" style={{ fontSize: '0.85rem' }}>
            {event.venue}
          </span>
        </div>

        {/* Participation Types */}
        <div className="mb-3">
          {event.participationTypes.map((type, index) => {
            const colors = getParticipationTypeColor(type);
            return (
              <span
                key={index}
                className="badge me-2 mb-1"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: '500'
                }}
              >
                {type}
              </span>
            );
          })}
        </div>

        {/* Description */}
        <p className="text-muted mb-4" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {event.description}
        </p>

        {/* Action Button */}
        <button
          className="btn w-100"
          onClick={isUpcoming ? onRegisterInterest : onViewHighlights}
          style={{
            backgroundColor: isUpcoming ? '#0d6efd' : 'transparent',
            border: isUpcoming ? '1px solid #0d6efd' : '1px solid #0d6efd',
            color: isUpcoming ? 'white' : '#0d6efd',
            transition: 'all 0.2s ease',
            fontSize: '0.85rem',
            padding: '10px 16px',
            borderRadius: '6px',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => {
            if (isUpcoming) {
              e.target.style.backgroundColor = '#0b5ed7';
            } else {
              e.target.style.backgroundColor = '#0d6efd';
              e.target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (isUpcoming) {
              e.target.style.backgroundColor = '#0d6efd';
            } else {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#0d6efd';
            }
          }}
        >
          {isUpcoming ? 'Register Your Interest' : 'View Event Highlights'}
        </button>
      </div>
    </div>
  );
};

export default EventsPage; 