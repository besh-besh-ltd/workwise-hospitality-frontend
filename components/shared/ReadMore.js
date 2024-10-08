import React, { useState } from 'react';

const ReadMore = ({ content, maxLength, textSmall }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div style={{cursor: "pointer"}}>
      <p className={`${textSmall ? 'text-sm' : ''} position-relative`}>
        {isExpanded ? content : `${content.slice(0, parseInt(maxLength) || 50)} ${content.length > maxLength ? "..." : ""}`}
        {content.length > maxLength && (
        <span
          onClick={handleToggle}
          className="btn-link p-0 text-primary cursor-pointer ms-2"
        >
          {isExpanded ? 'Read Less' : 'Read More'}
        </span>
      )}
      </p>      
    </div>
  );
};

export default ReadMore;
