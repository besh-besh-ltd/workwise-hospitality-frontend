import React from 'react';
import { ArrowUpRight, Phone } from 'lucide-react';

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
    let classes = "btn";
    
    // Variant classes
    switch (variant) {
      case "primary":
        classes += " btn-primary";
        break;
      case "secondary":
        classes += " btn-secondary";
        break;
      case "outline":
        classes += " btn-outline-primary";
        break;
      case "white":
        classes += " btn-light";
        break;
      case "black":
        classes += " btn-dark";
        break;
      case "gradient":
        classes += " btn-primary position-relative overflow-hidden";
        break;
      default:
        classes += " btn-primary";
    }
    
    // Size classes
    switch (size) {
      case "sm":
        classes += " btn-sm px-4 py-2";
        break;
      case "lg":
        classes += " btn-lg px-5 py-2.5";
        break;
      default:
        classes += " px-5 py-3";
        break;
    }
    
    return classes;
  };

  const getIcon = () => {
    switch (icon) {
      case "arrow":
        return <ArrowUpRight className="ms-2" size={16} />;
      case "phone":
        return <Phone className="me-2" size={16} />;
      default:
        return null;
    }
  };

  if (variant === "gradient") {
    return (
      <button
        className={`${getButtonClasses()} ${className || ''}`}
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
          {getIcon()}
        </div>
      </button>
    );
  }

  return (
    <button
      className={`${getButtonClasses()} ${className || ''}`}
      ref={ref}
      {...props}
    >
      <div className="d-flex align-items-center">
        {icon === "phone" && getIcon()}
        <span>{label || children}</span>
        {icon === "arrow" && getIcon()}
      </div>
    </button>
  );
});

Button.displayName = "Button";

export { Button }; 