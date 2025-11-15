import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendar,
  faMapMarkerAlt,
  faExternalLinkAlt,
  faFileAlt,
  faUsers,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

const DynamicCard = ({
  // Content
  title,
  subtitle,
  description,
  image,
  imageAlt,
  imagePlaceholder,
  imageHeight = 200,
  
  // Metadata
  date,
  location,
  venue,
  publisher,
  author,
  category,
  status,
  role,
  participationTypes,
  
  // Actions
  primaryAction,
  secondaryAction,
  onPrimaryAction,
  onSecondaryAction,
  
  // Styling
  variant = 'default', // 'default', 'featured', 'compact', 'minimal'
  size = 'medium', // 'small', 'medium', 'large'
  imagePosition = 'top', // 'top', 'left', 'none'
  
  // Custom styling
  className = '',
  style = {},
  
  // Card type for specific styling
  type = 'content', // 'content', 'news', 'event', 'testimonial', 'feature'
  
  // Additional props
  ...props
}) => {
  
  // Helpers
  const sanitizeForId = (value) =>
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const defaultCardIdFragment = sanitizeForId(typeof title === 'string' ? title : type);

  const buildActionId = (action, prefix) => {
    if (!action) return undefined;
    if (action.id) return action.id;
    const labelFragment = sanitizeForId(action.label);
    const base = labelFragment || defaultCardIdFragment || 'dynamic-card';
    return `${prefix}-${base}`;
  };

  // Size configurations
  const sizeConfig = {
    small: {
      imageHeight: 120,
      titleSize: '1rem',
      descriptionSize: '0.8rem',
      padding: 'p-3',
      gap: 'mb-2'
    },
    medium: {
      imageHeight: 200,
      titleSize: '1.1rem',
      descriptionSize: '0.85rem',
      padding: 'p-4',
      gap: 'mb-3'
    },
    large: {
      imageHeight: 360,
      titleSize: '1.3rem',
      descriptionSize: '1rem',
      padding: 'p-3',
      gap: 'mb-3'
    }
  };

  const config = sizeConfig[size];

  // Category color mapping
  const getCategoryColor = (cat, cardType) => {
    const colorMap = {
      // News categories
      'Featured': { bg: 'var(--orange-color)', text: 'var(--white-color)' },
      'Interview': { bg: 'var(--green-color)', text: 'var(--white-color)' },
      'Funding': { bg: 'var(--blue-color)', text: 'var(--white-color)' },
      'Award': { bg: 'var(--purple-color)', text: 'var(--white-color)' },
      'Event': { bg: 'var(--blue-color)', text: 'var(--white-color)' },
      'Partnership': { bg: 'var(--green-color)', text: 'var(--white-color)' },
      'Launch': { bg: 'var(--pink-color)', text: 'var(--white-color)' },
      'Report': { bg: 'var(--amber-color)', text: 'var(--black-color)' },
      
      // Event categories
      'Exhibitor': { bg: 'var(--light-blue-color)', text: 'var(--dark-blue-color)' },
      'Sponsor': { bg: 'var(--light-green-color)', text: 'var(--dark-green-color)' },
      'Speaker': { bg: 'var(--light-purple-color)', text: 'var(--dark-purple-color)' },
      'Delegate': { bg: 'var(--light-orange-color)', text: 'var(--dark-orange-color)' },
      
      // Status colors
      'Upcoming': { bg: 'var(--orange-color)', text: 'var(--white-color)' },
      'Past': { bg: 'var(--dark-grey-color)', text: 'var(--white-color)' },
      
      // Default
      'default': { bg: 'var(--light-grey-color)', text: 'var(--text-color)' }
    };
    
    return colorMap[cat] || colorMap['default'];
  };

  // Default image placeholder based on type
  const getDefaultImagePlaceholder = () => {
    switch (type) {
      case 'news':
        return { icon: faFileAlt, text: 'Publication Logo' };
      case 'event':
        return { icon: faCalendar, text: 'Event Image' };
      case 'testimonial':
        return { icon: faUsers, text: 'Profile Image' };
      default:
        return { icon: faFileAlt, text: 'Image' };
    }
  };

  const placeholder = imagePlaceholder || getDefaultImagePlaceholder();
  const PlaceholderIcon = placeholder.icon;

  // Render image section
  const renderImage = () => {
    if (imagePosition === 'none') return null;

    // For news large cards (Featured Coverage on desktop), use 16:9 container
    const useWideAspect = type === 'news' && size === 'large' && imagePosition === 'top';

    return (
      <div 
        className="position-relative"
        style={{
          height: useWideAspect ? 360 : config.imageHeight,
          marginTop: imagePosition === 'top' ? 8 : 0,
          backgroundColor: useWideAspect ? '#000' : 'var(--light-grey-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: imagePosition === 'top' ? '1px solid var(--border-color)' : 'none',
          borderRight: imagePosition === 'left' ? '1px solid var(--border-color)' : 'none',
          overflow: 'hidden'
        }}
      >
        {image ? (
          <img 
            src={image} 
            alt={imageAlt || title} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: useWideAspect ? 'cover' : 'cover',
              objectPosition: 'center'
            }}
          />
        ) : (
          <div className="text-center text-muted">
            <FontAwesomeIcon icon={PlaceholderIcon} style={{ fontSize: (size === 'large' ? 64 : size === 'small' ? 32 : 48) + 'px' }} />
            <div className={`mt-${size === 'large' ? '3' : '2'}`}>
              {placeholder.text}
            </div>
          </div>
        )}
        
        {/* Category/Status Tag */}
        {(category || status) && (
          <div 
            className="position-absolute"
            style={{
              top: size === 'large' ? '16px' : '12px',
              left: size === 'large' ? '16px' : '12px',
              padding: size === 'large' ? '6px 16px' : '4px 12px',
              borderRadius: '20px',
              fontSize: size === 'large' ? '0.8rem' : '0.75rem',
              fontWeight: '600',
              backgroundColor: getCategoryColor(category || status, type).bg,
              color: getCategoryColor(category || status, type).text,
              zIndex: 1
            }}
          >
            {category || status}
          </div>
        )}
      </div>
    );
  };

  // Render metadata section
  const renderMetadata = () => {
    if (!date && !location && !venue && !publisher && !author) return null;

    return (
      <div className={`d-flex align-items-center justify-content-between ${config.gap}`}>
        <div className="d-flex align-items-center">
          {date && (
            <div className="d-flex align-items-center me-3">
              <FontAwesomeIcon icon={faCalendar} className="text-muted me-1" style={{ fontSize: (size === 'small' ? 10 : 12) + 'px' }} />
              <span className="text-muted" style={{ fontSize: config.descriptionSize }}>
                {date}
              </span>
            </div>
          )}
          {location && (
            <div className="d-flex align-items-center me-3">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted me-1" style={{ fontSize: (size === 'small' ? 10 : 12) + 'px' }} />
              <span className="text-muted" style={{ fontSize: config.descriptionSize }}>
                {venue ? `${location} • ${venue}` : location}
              </span>
            </div>
          )}
        </div>
        
        {(publisher || author) && (
          <span className="text-primary" style={{ 
            fontSize: config.descriptionSize, 
            fontWeight: '500' 
          }}>
            {publisher || author}
          </span>
        )}
      </div>
    );
  };

  // Render metadata section for news (date only, publisher at bottom)
  const renderNewsMetadata = () => {
    if (!date) return null;

    return (
      <div className={`mb-${size === 'small' ? '2' : '3'}`}>
        <span className="text-muted" style={{ fontSize: config.descriptionSize }}>
          {date}
        </span>
      </div>
    );
  };

  // Render metadata section for events (date and location on one line)
  const renderEventMetadata = () => {
    if (!date && !location && !venue) return null;

    return (
      <div className={`d-flex align-items-start ${config.gap}`} style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        {date && (
          <div className="d-flex align-items-center me-3" style={{ flexShrink: 0 }}>
            <FontAwesomeIcon icon={faCalendar} className="text-muted me-1" style={{ fontSize: (size === 'small' ? 10 : 12) + 'px' }} />
            <span className="text-muted" style={{ fontSize: config.descriptionSize }}>
              {date}
            </span>
          </div>
        )}
        {location && (
          <div className="d-flex align-items-start" style={{ flex: '1 1 auto', minWidth: 0 }}>
            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted me-1" style={{ fontSize: (size === 'small' ? 10 : 12) + 'px', flexShrink: 0, marginTop: '2px' }} />
            <span className="text-muted" style={{ fontSize: config.descriptionSize, wordBreak: 'break-word' }}>
              {venue ? `${location} • ${venue}` : location}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render participation types (for events)
  const renderParticipationTypes = () => {
    if (!participationTypes || participationTypes.length === 0) return null;

    return (
      <div className={`mb-${size === 'small' ? '2' : '3'}`}>
        {participationTypes.map((type, index) => {
          const colors = getCategoryColor(type, 'event');
          return (
            <span
              key={index}
              className="badge me-2 mb-1"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                fontSize: size === 'small' ? '0.7rem' : '0.75rem',
                padding: size === 'small' ? '3px 6px' : '4px 8px',
                borderRadius: '12px',
                fontWeight: '500'
              }}
            >
              {type}
            </span>
          );
        })}
      </div>
    );
  };

  // Render actions
  const renderActions = () => {
    if (!primaryAction && !secondaryAction) return null;

    const primaryActionId = buildActionId(primaryAction, 'primary_action');
    const secondaryActionId = buildActionId(secondaryAction, 'secondary_action');

    return (
      <div className="d-flex align-items-center justify-content-between">
        {primaryAction && (
          <button
            id={primaryActionId}
            className="btn w-100"
            onClick={onPrimaryAction}
            style={{
              backgroundColor: primaryAction.variant === 'outline' ? 'transparent' : 'var(--primary-color)',
              border: '1px solid var(--primary-color)',
              color: primaryAction.variant === 'outline' ? 'var(--primary-color)' : 'var(--white-color)',
              transition: 'all 0.2s ease',
              fontSize: config.descriptionSize,
              padding: size === 'small' ? '8px 12px' : '10px 16px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (primaryAction.variant === 'outline') {
                e.target.style.backgroundColor = 'var(--primary-color)';
                e.target.style.color = 'var(--white-color)';
              } else {
                e.target.style.backgroundColor = 'var(--dark-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (primaryAction.variant === 'outline') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'var(--primary-color)';
              } else {
                e.target.style.backgroundColor = 'var(--primary-color)';
              }
            }}
          >
            {primaryAction.icon && <FontAwesomeIcon icon={primaryAction.icon} className="me-2" style={{ fontSize: (size === 'small' ? 12 : 14) + 'px' }} />}
            {primaryAction.label}
          </button>
        )}
        
        {secondaryAction && (
          <button
            id={secondaryActionId}
            className="btn btn-link p-0"
            onClick={onSecondaryAction}
            style={{
              color: secondaryAction.color || 'var(--primary-color)',
              textDecoration: 'none',
              fontSize: config.descriptionSize,
              fontWeight: '500'
            }}
          >
            {secondaryAction.label}
            {secondaryAction.showArrow && <FontAwesomeIcon icon={faExternalLinkAlt} className="ms-1" style={{ fontSize: (size === 'small' ? 12 : 14) + 'px' }} />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`card h-100 shadow-sm border-0 ${className}`} 
      style={{ 
        borderRadius: '8px', 
        overflow: 'hidden',
        minHeight: size === 'large' ? '400px' : '300px',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
      {...props}
    >
      {imagePosition === 'left' ? (
        <div className="d-flex h-100">
          {renderImage()}
          <div className={`card-body ${config.padding} flex-grow-1 d-flex flex-column`}>
            {renderMetadata()}
            <h5 className="card-title fw-bold text-dark mb-2" style={{ fontSize: config.titleSize, lineHeight: '1.3' }}>
              {title}
            </h5>
            {subtitle && (
              <h6 className="text-muted mb-2" style={{ fontSize: config.descriptionSize }}>
                {subtitle}
              </h6>
            )}
            {renderParticipationTypes()}
            {description && (
              <p className="text-muted mb-3 flex-grow-1" style={{ fontSize: config.descriptionSize, lineHeight: '1.4' }}>
                {description}
              </p>
            )}
            <div className="mt-auto">
              {renderActions()}
            </div>
          </div>
        </div>
      ) : (
        <>
          {renderImage()}
          <div className={`card-body ${config.padding} d-flex flex-column`}>
            {type === 'event' ? renderEventMetadata() : type === 'news' ? renderNewsMetadata() : renderMetadata()}
            <h5 className="card-title fw-bold text-dark mb-2" style={{ fontSize: config.titleSize, lineHeight: '1.3' }}>
              {title}
            </h5>
            {subtitle && (
              <h6 className="text-muted mb-2" style={{ fontSize: config.descriptionSize }}>
                {subtitle}
              </h6>
            )}
            {renderParticipationTypes()}
            {description && (
              <p className="text-muted mb-3 flex-grow-1" style={{ fontSize: config.descriptionSize, lineHeight: '1.4' }}>
                {description}
              </p>
            )}
            <div className="mt-auto">
              {type === 'news' ? (
                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-primary" style={{ 
                    fontSize: config.descriptionSize, 
                    fontWeight: '500' 
                  }}>
                    {publisher}
                  </span>
                  {renderActions()}
                </div>
              ) : (
                renderActions()
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export { DynamicCard }; 