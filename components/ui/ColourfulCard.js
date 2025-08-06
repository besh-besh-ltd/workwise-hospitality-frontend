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
    <div className="shadow rounded-4 overflow-hidden text-start h-100">
      {/* Header with gradient background */}
      <div className="p-4" style={{ background: bgGradient, color: "white" }}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h4 className="fw-bold text-white mb-1">{title}</h4>
            <div className="fw-normal">{subtitle}</div>
          </div>
          <div className="bg-white bg-opacity-25 p-2 rounded-circle">
            <FontAwesomeIcon icon={getIcon(icon)} className="text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-4">
        {/* Features */}
        {features && features.map((feature, idx) => (
          <Feature
            key={idx}
            icon={feature.icon}
            title={feature.title}
            desc={feature.description}
            iconColor={iconColor}
          />
        ))}

        {/* Button */}
        <Button
          variant={buttonVariant}
          className="w-100 py-2 fw-semibold rounded-3 text-white"
          style={buttonStyle}
          onClick={handleClick}
        >
          {buttonText}
        </Button>

        {/* Note */}
        {note && (
          <div className="text-muted text-center small mt-2">{note}</div>
        )}
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