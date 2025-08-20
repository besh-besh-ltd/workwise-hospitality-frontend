import React from 'react';
import { Button as ReactBootstrapButton } from 'react-bootstrap';

const Button = React.forwardRef(({ 
  className, 
  variant = "primary", 
  size = "default",
  label,
  icon = "none", // "arrow", "phone", "none"
  children,
  ...props 
}, ref) => {
  const getButtonClasses = () => {
    let classes = "";
    
    // Size classes
    switch (size) {
      case "sm":
        classes += " px-4 py-2";
        break;
      case "lg":
        classes += " px-5 py-2.5";
        break;
      default:
        classes += " px-5 py-3";
        break;
    }
    
    return classes;
  };

  const getVariant = () => {
    switch (variant) {
      case "primary":
        return "primary";
      case "secondary":
        return "secondary";
      case "outline":
        return "outline-primary";
      case "outline-white":
        return "outline-light";
      case "white":
        return "light";
      case "black":
        return "primary";
      case "gradient":
        return "primary";
      default:
        return "primary";
    }
  };

  if (variant === "gradient") {
    return (
      <ReactBootstrapButton
        variant={getVariant()}
        className={`position-relative overflow-hidden ${getButtonClasses()} ${className || ''}`}
        ref={ref}
        {...props}
      >
        {/* Gradient background effect */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.8,
            zIndex: -1
          }}
        />

        {/* Content */}
        <div className="d-flex align-items-center justify-content-center">
          <span className="text-white">{label || children}</span>
        </div>
      </ReactBootstrapButton>
    );
  }

  if (variant === "black") {
    return (
      <ReactBootstrapButton
        variant={getVariant()}
        className={`position-relative overflow-hidden ${getButtonClasses()} ${className || ''}`}
        ref={ref}
        {...props}
      >
        <div className="d-flex align-items-center">
          <span>{label || children}</span>
        </div>
      </ReactBootstrapButton>
    );
  }

  return (
    <ReactBootstrapButton
      variant={getVariant()}
      className={`${getButtonClasses()} ${className || ''}`}
      ref={ref}
      {...props}
    >
      <div className="d-flex align-items-center justify-content-center">
        <span>{label || children}</span>
      </div>
    </ReactBootstrapButton>
  );
});

Button.displayName = "Button";

export { Button }; 