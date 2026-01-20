import React from "react";
import { Alert, Button } from "react-bootstrap";
import { useRouter } from "next/router";
import { MdBlock } from "react-icons/md";

/**
 * Access Denied page component
 * Shows when user lacks "read" permission for a module
 */
const AccessDeniedPage = ({
  title = "Access Denied",
  message = "You do not have permission to view this content.",
  showBackButton = true,
  backUrl = "/dashboard/buyer/rfq-management",
  backLabel = "Back to Management",
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <div className="py-5 px-3" style={{ width: "100%", overflow: "hidden" }}>
      <div className="mx-auto" style={{ maxWidth: 640 }}>
        <Alert variant="danger" className="text-center py-5">
          <MdBlock size={64} className="mb-3 text-danger" />
          <Alert.Heading className="h4">{title}</Alert.Heading>
          <p className="mb-1">{message}</p>
          <p className="text-muted small mb-4">
            If you believe this is an error, please contact your administrator
            to request access.
          </p>
          {showBackButton && (
            <Button
              className="btn-sm p-2"
              style={{ width: "250px" }}
              variant="outline-danger"
              onClick={handleBack}
              id="back_button-access_denied_page"
            >
              {backLabel}
            </Button>
          )}
        </Alert>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
