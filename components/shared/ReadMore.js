import React, { useState, useRef, useEffect } from 'react';

const ReadMore = ({
  content,
  maxLines = 2,
  fontSize,
  additionalClasses = '',
  additionalStyles = {},
  onClick,
  linkClassName = 'text-primary',
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
    display: isExpanded ? 'block' : '-webkit-box',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    WebkitLineClamp: isExpanded ? 'unset' : maxLines,
    fontSize,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    ...additionalStyles,
  };

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      style={{
        cursor: isOverflowing ? "pointer" : "default",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "visible",
        wordBreak: "break-word"
      }}
      className="d-flex flex-column"
      onClick={handleClick}
      onMouseDown={handleClick}
      onMouseUp={handleClick}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflow: "visible"
        }}
      >
        <p
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onClick) onClick(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          ref={contentRef}
          className={`position-relative mb-0 ${additionalClasses}`}
          style={{
            ...containerStyles,
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            marginBottom: isOverflowing ? "4px" : "0",
            boxSizing: "border-box"
          }}
        >
          {content}
        </p>
      </div>
      {isOverflowing && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleToggle();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          className={`btn-link p-0 ${linkClassName} cursor-pointer`}
          style={{
            flexShrink: 0,
            alignSelf: "flex-start",
            marginTop: "2px",
            whiteSpace: "nowrap",
            display: "inline-block",
            fontSize: fontSize || "inherit",
          }}
        >
          {isExpanded ? "Read Less" : "Read More"}
        </span>
      )}
    </div>
  );
};

export default ReadMore;
