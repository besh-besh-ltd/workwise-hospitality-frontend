import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'react-bootstrap';
import {
  faChartColumn,
  faLightbulb,
  faStream,
  faMoneyBill,
  faWandMagicSparkles,
  faClock,
  faList,
  faScrewdriverWrench,
  faRobot,
  faChartLine,
  faBolt,
  faUsers,
  faListAlt,
  faFileAlt,
  faCalculator,
  faShare,
  faShareAlt
} from '@fortawesome/free-solid-svg-icons';

const ColourfulCard = ({
  title,
  subtitle,
  bgGradient,
  icon,
  features,
  buttonText,
  buttonVariant,
  iconColor,
  note,
  buttonStyle,
  url,
  onClick
}) => {
  // Icon mapping
  const getIcon = (iconName) => {
    const iconMap = {
      'chart-column': faChartColumn,
      'lightbulb': faLightbulb,
      'stream': faStream,
      'money-bill': faMoneyBill,
      'wand-magic-sparkles': faWandMagicSparkles,
      'clock': faClock,
      'list': faList,
      'screwdriver-wrench': faScrewdriverWrench,
      'robot': faRobot,
      'chart-line': faChartLine,
      'bolt': faBolt,
      'users': faUsers,
      'list-alt': faListAlt,
      'file-alt': faFileAlt,
      'calculator': faCalculator
    };
    return iconMap[iconName] || faChartColumn;
  };

  const handleClick = () => {
    if (onClick) {
      onClick(url);
    } else if (url) {
      window.location.href = url;
    }
  };

  return (
    <div 
      className="shadow rounded-4 overflow-hidden text-start h-100"
      onClick={() => {
        // In mobile, make entire card clickable to go to provided url (fallback to /ai-tools)
        if (typeof window !== 'undefined' && window.innerWidth < 992) {
          if (url) {
            window.location.href = url;
          } else {
            window.location.href = '/ai-tools';
          }
        }
      }}
      style={{ cursor: typeof window !== 'undefined' && window.innerWidth < 992 ? 'pointer' : 'default' }}
    >
      {/* Header with gradient background */}
      <div className="p-4 position-relative" style={{ background: bgGradient, color: "white" }}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h4 className="fw-bold text-white mb-1">{title}</h4>
            <div className="fw-normal d-none d-lg-block">{subtitle}</div>
            <div className="fw-normal d-lg-none" style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {subtitle}
            </div>
          </div>
          {/* Hide top-right icon on mobile */}
          <div 
            className="position-absolute bg-white bg-opacity-25 p-2 rounded-circle d-none d-lg-block"
            style={{ top: '16px', right: '16px' }}
          >
            <FontAwesomeIcon icon={getIcon(icon)} className="text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-4">
        {/* Features - Hidden on mobile */}
        <div className="d-none d-lg-block">
          {features && features.map((feature, idx) => (
            <Feature
              key={idx}
              icon={feature.icon}
              title={feature.title}
              desc={feature.description}
              iconColor={iconColor}
            />
          ))}
        </div>

        {/* Button - show only on desktop; on mobile, whole card is clickable */}
        <div className="d-none d-lg-block">
          <Button
            variant={buttonVariant}
            className="w-100 py-2 fw-semibold rounded-3 text-white"
            style={{
              ...buttonStyle,
              background: bgGradient,
              border: 'none'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            {buttonText}
          </Button>
        </div>

        {/* Note - Hidden on mobile */}
        {note && (
          <div className="text-muted text-center small mt-2 d-none d-lg-block">{note}</div>
        )}

        {/* Mobile Learn More Section */}
        <div className="d-lg-none">
          {/* Learn More Link */}
          <div className="text-center">
            <span 
              className="text-decoration-none fw-bold d-inline-flex align-items-center small"
              style={{ color: iconColor || '#007bff', fontSize: '16px' }}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Try Now →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Feature component for individual features
const Feature = ({ icon, title, desc, iconColor }) => {
  const getIcon = (iconName) => {
    const iconMap = {
      'wand-magic-sparkles': faWandMagicSparkles,
      'clock': faClock,
      'chart-column': faChartColumn,
      'lightbulb': faLightbulb,
      'robot': faRobot,
      'share-alt': faShareAlt,
      'share': faShare,
      'list': faList,
      'screwdriver-wrench': faScrewdriverWrench,
      'money-bill': faMoneyBill,
      'chart-line': faChartLine,
      'bolt': faBolt,
      'extract': faChartColumn,
      'deadlines': faClock,
      'compliance': faList,
      'simplify': faLightbulb,
      'insights': faChartColumn,
      'breakdown': faMoneyBill,
      'market-rates': faChartLine,
      'rapid-estimation': faBolt,
      'skip': faBolt,
      'never-miss': faClock
    };
    return iconMap[iconName] || faChartColumn;
  };

  return (
    <div className="d-flex align-items-start mb-4">
      <div
        className="d-flex align-items-center justify-content-center me-3 p-2"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: `${iconColor}26`, // 15% opacity as hex suffix
        }}
      >
        <FontAwesomeIcon
          icon={getIcon(icon)}
          style={{ color: iconColor, fontSize: "16px" }}
        />
      </div>

      <div>
        <strong>{title}</strong>
        <div className="text-muted small">{desc}</div>
      </div>
    </div>
  );
};

export { ColourfulCard }; 