import React, { useState } from 'react';
import { 
  Target,
  Zap,
  Building,
  Wrench,
  Settings,
  Waves,
  MapPin,
  ChevronDown,
  Phone
} from 'lucide-react';

// Import reusable components
import { Button } from '@/components/ui/Button';
import { CtaSection } from '@/components/ui/CtaSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import SuccessStoryModal from '@/components/modal/SuccessStoryModal';

// Import data
import { successStoriesData } from '@/components/constants/successStoriesData';

const SuccessStoriesPage = () => {
  const [stakeholderType, setStakeholderType] = useState('All Types');
  const [projectValueRange, setProjectValueRange] = useState('All Ranges');
  const [visibleStories, setVisibleStories] = useState(6);
  const [selectedStory, setSelectedStory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStakeholderDropdown, setShowStakeholderDropdown] = useState(false);
  const [showValueDropdown, setShowValueDropdown] = useState(false);

  const handleBookCall = () => {
    console.log('Book a Call clicked');
  };

  const handleLoadMore = () => {
    setVisibleStories(prev => Math.min(prev + 6, successStoriesData.stories.length));
  };

  const handleReadMore = (story) => {
    setSelectedStory(story);
    setShowModal(true);
  };

  // Filter stories based on selected filters
  const filteredStories = successStoriesData.stories.filter(story => {
    const matchesStakeholder = stakeholderType === 'All Types' || story.stakeholderType === stakeholderType;
    const matchesValue = projectValueRange === 'All Ranges' || story.projectValueRange === projectValueRange;
    return matchesStakeholder && matchesValue;
  });

  const displayedStories = filteredStories.slice(0, visibleStories);

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
                {successStoriesData.hero.title}
              </h1>

              {/* Description */}
              <p className="text-white mb-4 text-start" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                {successStoriesData.hero.subtitle}
              </p>

              {/* Filters */}
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="position-relative">
                    <label className="form-label text-white small mb-2">{successStoriesData.filters.stakeholderType.label}</label>
                    <div className="custom-dropdown" style={{ position: 'relative', width: '100%' }}>
                      <div 
                        className="custom-dropdown-header"
                        onClick={() => setShowStakeholderDropdown(!showStakeholderDropdown)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: '#495057',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      >
                        <span>{stakeholderType}</span>
                        <ChevronDown 
                          className={`dropdown-arrow ${showStakeholderDropdown ? 'rotated' : ''}`} 
                          size={14} 
                          style={{
                            transition: 'transform 0.2s ease',
                            color: '#6c757d',
                            transform: showStakeholderDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        />
                      </div>
                      {showStakeholderDropdown && (
                        <div 
                          className="custom-dropdown-menu"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #dee2e6',
                            borderTop: 'none',
                            borderRadius: '0 0 6px 6px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}
                        >
                          {successStoriesData.filters.stakeholderType.options.map((option) => (
                            <div
                              key={option}
                              className={`custom-dropdown-item ${stakeholderType === option ? 'active' : ''}`}
                              onClick={() => {
                                setStakeholderType(option);
                                setShowStakeholderDropdown(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                color: stakeholderType === option ? '#0d6efd' : '#495057',
                                transition: 'background-color 0.2s ease',
                                backgroundColor: stakeholderType === option ? '#e3f2fd' : 'transparent',
                                fontWeight: stakeholderType === option ? '500' : 'normal',
                                borderBottom: '1px solid #f1f3f4'
                              }}
                              onMouseEnter={(e) => {
                                if (stakeholderType !== option) {
                                  e.target.style.backgroundColor = '#f8f9fa';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (stakeholderType !== option) {
                                  e.target.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="position-relative">
                    <label className="form-label text-white small mb-2">{successStoriesData.filters.projectValueRange.label}</label>
                    <div className="custom-dropdown" style={{ position: 'relative', width: '100%' }}>
                      <div 
                        className="custom-dropdown-header"
                        onClick={() => setShowValueDropdown(!showValueDropdown)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: '#495057',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      >
                        <span>{projectValueRange}</span>
                        <ChevronDown 
                          className={`dropdown-arrow ${showValueDropdown ? 'rotated' : ''}`} 
                          size={14} 
                          style={{
                            transition: 'transform 0.2s ease',
                            color: '#6c757d',
                            transform: showValueDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        />
                      </div>
                      {showValueDropdown && (
                        <div 
                          className="custom-dropdown-menu"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #dee2e6',
                            borderTop: 'none',
                            borderRadius: '0 0 6px 6px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}
                        >
                          {successStoriesData.filters.projectValueRange.options.map((option) => (
                            <div
                              key={option}
                              className={`custom-dropdown-item ${projectValueRange === option ? 'active' : ''}`}
                              onClick={() => {
                                setProjectValueRange(option);
                                setShowValueDropdown(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                color: projectValueRange === option ? '#0d6efd' : '#495057',
                                transition: 'background-color 0.2s ease',
                                backgroundColor: projectValueRange === option ? '#e3f2fd' : 'transparent',
                                fontWeight: projectValueRange === option ? '500' : 'normal',
                                borderBottom: '1px solid #f1f3f4'
                              }}
                              onMouseEnter={(e) => {
                                if (projectValueRange !== option) {
                                  e.target.style.backgroundColor = '#f8f9fa';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (projectValueRange !== option) {
                                  e.target.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex flex-column h-100 justify-content-end">
                    <button
                      onClick={handleBookCall}
                      className="btn w-100 h-100 d-flex align-items-center justify-content-center text-white fw-medium"
                      style={{ 
                        backgroundColor: '#fd7e14',
                        borderColor: '#fd7e14',
                        fontSize: '0.9rem',
                        padding: '12px 16px',
                        borderRadius: '6px'
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <Phone className="me-2" size={14} />
                        <div className="text-start">
                          <div>{successStoriesData.hero.ctaButton.text}</div>
                          <div>{successStoriesData.hero.ctaButton.subtext}</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Grid */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row g-4">
            {displayedStories.map((story, index) => (
              <div key={story.id} className="col-md-6 col-lg-4">
                <SuccessStoryCard
                  story={story}
                  onReadMore={() => handleReadMore(story)}
                />
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {visibleStories < filteredStories.length && (
            <div className="text-center mt-5">
              <button
                onClick={handleLoadMore}
                className="btn btn-primary px-4 py-2 fw-medium"
                style={{ 
                  backgroundColor: '#0d6efd',
                  borderColor: '#0d6efd',
                  color: 'white',
                  fontSize: '0.9rem',
                  borderRadius: '6px'
                }}
              >
                {successStoriesData.loadMoreButton.text}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <CtaSection
        title={successStoriesData.cta.title}
        primaryButton={{
          ...successStoriesData.cta.primaryButton,
          onClick: handleBookCall
        }}
        secondaryButton={{
          ...successStoriesData.cta.secondaryButton,
          onClick: () => setVisibleStories(successStoriesData.stories.length)
        }}
      />

      {/* Success Story Modal */}
      <SuccessStoryModal
        show={showModal}
        onClose={() => setShowModal(false)}
        story={selectedStory}
        onBookCall={handleBookCall}
      />
    </div>
  );
};

// Success Story Card Component using FeatureCard
const SuccessStoryCard = ({ story, onReadMore }) => {
  const getIcon = () => {
    switch (story.icon) {
      case 'zap':
        return Zap;
      case 'building':
        return Building;
      case 'wrench':
        return Wrench;
      case 'settings':
        return Settings;
      case 'waves':
        return Waves;
      default:
        return Target;
    }
  };

  const getIconColor = () => {
    switch (story.icon) {
      case 'zap':
        return 'text-warning';
      case 'building':
        return 'text-primary';
      case 'wrench':
        return 'text-info';
      case 'settings':
        return 'text-secondary';
      case 'waves':
        return 'text-info';
      default:
        return 'text-danger';
    }
  };

  const getStakeholderColor = () => {
    switch (story.stakeholderType) {
      case 'EPC Contractor':
        return 'bg-primary';
      case 'Industrial Client':
        return 'bg-success';
      case 'Consultant':
        return 'bg-purple';
      case 'Vendor/OEM':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const IconComponent = getIcon();

  return (
    <FeatureCard
      icon={IconComponent}
      iconBgColor="bg-light"
      iconColor={getIconColor()}
      title={story.industry}
      description={
        <div className="text-start">
          {/* Achievement */}
          <p className="text-muted mb-2" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
            {story.achievement}
          </p>

          {/* Stakeholder Type Tag */}
          <div className="mb-2">
            <span className={`badge ${getStakeholderColor()} text-white`} style={{ fontSize: '0.75rem' }}>
              {story.stakeholderType}
            </span>
          </div>

          {/* Location */}
          <div className="d-flex align-items-center mb-3">
            <MapPin className="text-muted me-1" size={12} />
            <span className="text-muted small" style={{ fontSize: '0.8rem' }}>{story.location}</span>
          </div>

          {/* Read More Button - Non-animated */}
          <button
            className="btn btn-secondary w-100"
            onClick={onReadMore}
            style={{ 
              backgroundColor: '#6c757d', 
              borderColor: '#6c757d',
              color: 'white',
              transition: 'none',
              fontSize: '0.85rem',
              padding: '8px 12px',
              borderRadius: '6px'
            }}
          >
            Read More
          </button>
        </div>
      }
      className="text-start"
    />
  );
};

export default SuccessStoriesPage; 