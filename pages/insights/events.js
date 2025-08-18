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
import { registerInterestService } from '@/services/contact';
import { DynamicCard } from '@/components/ui/DynamicCard';
import { HeroSection } from '@/components/ui/HeroSection';

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
    // Align payload keys to backend expectations (same as contact-us)
    const payload = {
      name: formData.fullName,
      email: formData.workEmail,
      phone: formData.phoneNumber,
      subject: selectedEvent ? `Event Registration: ${selectedEvent.name}` : 'Event Updates',
      comment: formData.companyName ? `Company: ${formData.companyName}` : 'Event form submission',
      submitted_from: 'events'
    };
    await registerInterestService(payload);
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



  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Hero Section */}
      <HeroSection
        title={eventsData.hero.title}
        subtitle={eventsData.hero.subtitle}
        layout="centered"
        size="small"
        textAlign="left"
        showVisual={false}
      />

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
                  <DynamicCard
                    type="event"
                    size="medium"
                    title={event.name}
                    description={event.description}
                    date={event.date}
                    location={event.location}
                    venue={event.venue}
                    status={event.status}
                    participationTypes={event.participationTypes}
                    image={event.image}
                    primaryAction={{
                      label: "Register Your Interest",
                      variant: "default"
                    }}
                    onPrimaryAction={() => handleRegisterInterest(event)}
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
                  <DynamicCard
                    type="event"
                    size="medium"
                    title={event.name}
                    description={event.description}
                    date={event.date}
                    location={event.location}
                    venue={event.venue}
                    status={event.status}
                    participationTypes={event.participationTypes}
                    image={event.image}
                    primaryAction={{
                      label: "View Event Highlights",
                      variant: "outline"
                    }}
                    onPrimaryAction={() => handleViewHighlights(event)}
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
          background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)'
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



export default EventsPage; 