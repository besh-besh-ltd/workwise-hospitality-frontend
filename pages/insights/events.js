import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faClock } from '@fortawesome/free-solid-svg-icons';

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

  // Helper: parse various date formats and return the event end-date (Date)
  const getEventEndDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const s = dateStr.replace(/\u2013|\u2014/g, '-').trim(); // normalize en/em dashes to '-'

    // Month mapping with common variants
    const monthMap = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };

    // Patterns we expect:
    // 1) "11-14 Feb 2025" or "5-7 Mar 2025"
    let m = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
    if (m) {
      const endDay = parseInt(m[2], 10);
      const monthKey = m[3].toLowerCase();
      const year = parseInt(m[4].length === 2 ? `20${m[4]}` : m[4], 10);
      const month = monthMap[monthKey];
      if (month === undefined) return null;
      return new Date(year, month, endDay);
    }

    // 2) "22-24 Aug 2025" already handled above; 3) single day like "8-Aug-25" or "8 Aug 2025"
    m = s.match(/^(\d{1,2})[\s-]*([A-Za-z]+)[\s-]*(\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const monthKey = m[2].toLowerCase();
      const year = parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10);
      const month = monthMap[monthKey];
      if (month === undefined) return null;
      return new Date(year, month, day);
    }

    // Fallback: try Date.parse directly
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const handleRegisterInterest = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleFormSubmit = async (formData) => {
    // Align payload keys to backend expectations (same as contact-us)
    const payload = {
      name: formData.fullName,
      email: formData.workEmail,
      phone: formData.phoneNumber,
      subject: selectedEvent ? `Event Registration: ${selectedEvent.name}` : 'Event Updates',
      comment: formData.companyName ? `Company: ${formData.companyName}` : 'Event form submission',
      submitted_from: '1'
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

  // Compute status automatically from dates
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventsWithComputedStatus = eventsData.events.map((event) => {
    const endDate = getEventEndDate(event.date);
    const computedStatus = endDate && endDate < todayStart ? 'Past' : 'Upcoming';
    return { ...event, status: computedStatus };
  });

  // Filter events based on selected filters and search term
  const filteredEvents = eventsWithComputedStatus.filter(event => {
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
            <div className="row g-4 justify-content-center">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="col-md-6 col-lg-5 col-xl-4">
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
                <FontAwesomeIcon icon={faCalendar} className="text-muted" style={{ fontSize: '48px' }} />
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
            <div className="row g-4 justify-content-center">
              {pastEvents.map((event) => (
                <div key={event.id} className="col-md-6 col-lg-5 col-xl-4">
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
                    // primaryAction={{
                    //   label: "View Event Highlights",
                    //   variant: "outline"
                    // }}
                    // onPrimaryAction={() => handleViewHighlights(event)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <FontAwesomeIcon icon={faClock} className="text-muted" style={{ fontSize: '48px' }} />
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
                id="get_updates-final_cta-insights_events_page"
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