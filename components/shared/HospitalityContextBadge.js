import React, { useEffect, useState } from "react";
import {
  getStoredHospitalityContext,
  subscribeHospitalityContext,
} from "@/utils/hospitalityContext";

const HospitalityContextBadge = ({ className = "" }) => {
  const [context, setContext] = useState(getStoredHospitalityContext());

  useEffect(() => {
    const unsubscribe = subscribeHospitalityContext(setContext);
    return () => unsubscribe && unsubscribe();
  }, []);

  if (!context) {
    return (
      <div className={`alert alert-light border ${className}`} role="alert">
        <strong>Hospitality Scope:</strong> Not selected
      </div>
    );
  }

  return (
    <div className={`alert alert-primary ${className}`} role="alert">
      <div className="fw-semibold">Hospitality Scope</div>
      <div>
        Company: <strong>{context.companyName}</strong>
      </div>
      {context.hotelId ? (
        <div>
          Hotel: <strong>{context.hotelName}</strong>
        </div>
      ) : (
        <div>Company-wide access</div>
      )}
    </div>
  );
};

export default HospitalityContextBadge;

