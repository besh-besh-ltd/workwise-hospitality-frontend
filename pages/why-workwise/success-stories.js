import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout';
import { 
  Target, 
  Zap, 
  Building, 
  Wrench, 
  Settings, 
  Waves,
  MapPin,
  Phone
} from 'lucide-react';

// Import reusable components
import { CtaSection } from '@/components/ui/CtaSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { Dropdown } from '@/components/ui/Dropdown';
import SuccessStoryModal from '@/components/modal/SuccessStoryModal';
import { HeroSection } from '@/components/ui/HeroSection';

// Import data
import { successStoriesData } from '@/components/constants/successStoriesData';

const SuccessStoriesPage = () => {
  const [mounted, setMounted] = useState(false);
  const [stakeholderType, setStakeholderType] = useState('All Types');
  const [projectValueRange, setProjectValueRange] = useState('All Ranges');
  const [visibleStories, setVisibleStories] = useState(6);
  const [selectedStory, setSelectedStory] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

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
    <Layout>
      <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        {/* Hero Section */}
        <HeroSection
        title={successStoriesData.hero.title}
        subtitle={successStoriesData.hero.subtitle}
        layout="centered"
        size="medium"
        textAlign="left"
        showVisual={false}
        className="pb-0"
      >
        {/* Custom Filters Section */}
        <div className="container mt-4">
          <div className="row g-3 justify-content-center">
            <div className="col-md-3">
              <Dropdown
                label={successStoriesData.filters.stakeholderType.label}
                options={successStoriesData.filters.stakeholderType.options}
                value={stakeholderType}
                onChange={setStakeholderType}
              />
            </div>
            <div className="col-md-3">
              <Dropdown
                label={successStoriesData.filters.projectValueRange.label}
                options={successStoriesData.filters.projectValueRange.options}
                value={projectValueRange}
                onChange={setProjectValueRange}
              />
            </div>
            {/* <div className="col-md-4">
              <div className="d-flex flex-column h-100 justify-content-end">
                <button
                  onClick={handleBookCall}
                  className="btn w-100 h-100 d-flex align-items-center justify-content-center text-white fw-medium"
                                        style={{ 
                        backgroundColor: 'var(--tertiary-color)',
                        borderColor: 'var(--tertiary-color)',
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
            </div> */}
          </div>
        </div>
      </HeroSection>

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
                  backgroundColor: 'var(--primary-color)',
                  borderColor: 'var(--primary-color)',
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

      {/* Success Story Modal - reduce spacing for mobile */}
      <SuccessStoryModal
        show={showModal}
        onClose={() => setShowModal(false)}
        story={selectedStory}
        onBookCall={handleBookCall}
      />
      </div>
    </Layout>
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

          {/* Read More Button */}
          <button
            className="btn btn-secondary w-100"
            onClick={onReadMore}
            style={{ 
              backgroundColor: 'var(--muted-text)', 
              borderColor: 'var(--muted-text)',
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