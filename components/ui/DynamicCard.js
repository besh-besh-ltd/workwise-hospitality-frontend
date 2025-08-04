import React from 'react';
import { 
  Calendar,
  MapPin,
  ExternalLink,
  FileText,
  Users,
  ArrowRight
} from 'lucide-react';

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
      imageHeight: 280,
      titleSize: '1.3rem',
      descriptionSize: '1rem',
      padding: 'p-4',
      gap: 'mb-4'
    }
  };

  const config = sizeConfig[size];

  // Category color mapping
  const getCategoryColor = (cat, cardType) => {
    const colorMap = {
      // News categories
      'Featured': { bg: '#ff9800', text: 'white' },
      'Interview': { bg: '#4caf50', text: 'white' },
      'Funding': { bg: '#2196f3', text: 'white' },
      'Award': { bg: '#9c27b0', text: 'white' },
      'Event': { bg: '#2196f3', text: 'white' },
      'Partnership': { bg: '#4caf50', text: 'white' },
      'Launch': { bg: '#f44336', text: 'white' },
      'Report': { bg: '#ffc107', text: 'black' },
      
      // Event categories
      'Exhibitor': { bg: '#e3f2fd', text: '#1976d2' },
      'Sponsor': { bg: '#e8f5e8', text: '#2e7d32' },
      'Speaker': { bg: '#f3e5f5', text: '#7b1fa2' },
      'Delegate': { bg: '#fff3e0', text: '#f57c00' },
      
      // Status colors
      'Upcoming': { bg: '#ff9800', text: 'white' },
      'Past': { bg: '#6c757d', text: 'white' },
      
      // Default
      'default': { bg: '#f5f5f5', text: '#616161' }
    };
    
    return colorMap[cat] || colorMap['default'];
  };

  // Default image placeholder based on type
  const getDefaultImagePlaceholder = () => {
    switch (type) {
      case 'news':
        return { icon: FileText, text: 'Publication Logo' };
      case 'event':
        return { icon: Calendar, text: 'Event Image' };
      case 'testimonial':
        return { icon: Users, text: 'Profile Image' };
      default:
        return { icon: FileText, text: 'Image' };
    }
  };

  const placeholder = imagePlaceholder || getDefaultImagePlaceholder();
  const PlaceholderIcon = placeholder.icon;

  // Render image section
  const renderImage = () => {
    if (imagePosition === 'none') return null;

    return (
      <div 
        className="position-relative"
        style={{
          height: config.imageHeight,
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: imagePosition === 'top' ? '1px solid #dee2e6' : 'none',
          borderRight: imagePosition === 'left' ? '1px solid #dee2e6' : 'none'
        }}
      >
        {image ? (
          <img 
            src={image} 
            alt={imageAlt || title} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }}
          />
        ) : (
          <div className="text-center text-muted">
            <PlaceholderIcon size={size === 'large' ? 64 : size === 'small' ? 32 : 48} />
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
              color: getCategoryColor(category || status, type).text
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
              <Calendar className="text-muted me-1" size={size === 'small' ? 10 : 12} />
              <span className="text-muted" style={{ fontSize: config.descriptionSize }}>
                {date}
              </span>
            </div>
          )}
          {location && (
            <div className="d-flex align-items-center me-3">
              <MapPin className="text-muted me-1" size={size === 'small' ? 10 : 12} />
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
      <div className={`d-flex align-items-center ${config.gap}`}>
        {date && (
          <div className="d-flex align-items-center me-3">
            <Calendar className="text-muted me-1" size={size === 'small' ? 10 : 12} />
            <span className="text-muted" style={{ fontSize: config.descriptionSize }}>
              {date}
            </span>
          </div>
        )}
        {location && (
          <div className="d-flex align-items-center">
            <MapPin className="text-muted me-1" size={size === 'small' ? 10 : 12} />
            <span className="text-muted" style={{ fontSize: config.descriptionSize }}>
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

    return (
      <div className="d-flex align-items-center justify-content-between">
        {primaryAction && (
          <button
            className="btn w-100"
            onClick={onPrimaryAction}
            style={{
              backgroundColor: primaryAction.variant === 'outline' ? 'transparent' : '#0d6efd',
              border: '1px solid #0d6efd',
              color: primaryAction.variant === 'outline' ? '#0d6efd' : 'white',
              transition: 'all 0.2s ease',
              fontSize: config.descriptionSize,
              padding: size === 'small' ? '8px 12px' : '10px 16px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (primaryAction.variant === 'outline') {
                e.target.style.backgroundColor = '#0d6efd';
                e.target.style.color = 'white';
              } else {
                e.target.style.backgroundColor = '#0b5ed7';
              }
            }}
            onMouseLeave={(e) => {
              if (primaryAction.variant === 'outline') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#0d6efd';
              } else {
                e.target.style.backgroundColor = '#0d6efd';
              }
            }}
          >
            {primaryAction.icon && <primaryAction.icon size={size === 'small' ? 12 : 14} className="me-2" />}
            {primaryAction.label}
          </button>
        )}
        
        {secondaryAction && (
          <button
            className="btn btn-link p-0"
            onClick={onSecondaryAction}
            style={{
              color: secondaryAction.color || '#0d6efd',
              textDecoration: 'none',
              fontSize: config.descriptionSize,
              fontWeight: '500'
            }}
          >
            {secondaryAction.label}
            {secondaryAction.showArrow && <ExternalLink size={size === 'small' ? 12 : 14} className="ms-1" />}
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
        ...style
      }}
      {...props}
    >
      {imagePosition === 'left' ? (
        <div className="d-flex">
          {renderImage()}
          <div className={`card-body ${config.padding} flex-grow-1`}>
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
              <p className="text-muted mb-3" style={{ fontSize: config.descriptionSize, lineHeight: '1.4' }}>
                {description}
              </p>
            )}
            {renderActions()}
          </div>
        </div>
      ) : (
        <>
          {renderImage()}
          <div className={`card-body ${config.padding}`}>
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
              <p className="text-muted mb-3" style={{ fontSize: config.descriptionSize, lineHeight: '1.4' }}>
                {description}
              </p>
            )}
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
        </>
      )}
    </div>
  );
};

export { DynamicCard }; 