import React from "react";
import { Alert } from "react-bootstrap";
import { MdLock } from "react-icons/md";

/**
 * Read-only mode banner component
 * Shows when user has "read" but not "update" permission
 */
const ReadOnlyBanner = ({
  title = "View Only Mode",
  message = "You don't have edit permissions for this tender.",
  variant = "warning",
  className = "",
  dismissible = false,
  onDismiss = null,
}) => {
  return (
    <Alert
      variant={variant}
      className={`mb-3 ${className} mx-4 mb-4`}
      dismissible={dismissible}
      onClose={onDismiss}
    >
      <div className="d-flex align-items-start gap-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-25"
          style={{ width: 40, height: 40, minWidth: 40 }}
        >
          <MdLock size={20} className="text-warning" />
        </div>
        <div>
          <Alert.Heading className="h6 mb-1">{title}</Alert.Heading>
          <p className="mb-0 small text-muted">{message}</p>
        </div>
      </div>
    </Alert>
  );
};

export default ReadOnlyBanner;
