import React, { useState, useRef, useEffect } from 'react';

const ReadMore = ({
  content,
  maxLines = 2,
  fontSize,
  additionalClasses = '',
  additionalStyles = {},
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef(null);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [content, maxLines]);

  const containerStyles = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    WebkitLineClamp: isExpanded ? 'unset' : maxLines,
    fontSize,
    ...additionalStyles,
  };

  return (
    <div
      style={{ cursor: "pointer" }}
      className="d-flex flex-column align-items-start"
    >
      <p
        onClick={onClick}
        ref={contentRef}
        className={`position-relative mb-0 ${additionalClasses}`}
        style={containerStyles}
      >
        {content}
      </p>
      {isOverflowing && (
        <span
          onClick={() => {
            handleToggle();
          }}
          className="btn-link p-0 text-primary text-sm cursor-pointer align-self-end"
        >
          {isExpanded ? "Read Less" : "Read More"}
        </span>
      )}
    </div>
  );
};

export default ReadMore;
