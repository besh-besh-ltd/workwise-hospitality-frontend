import React from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { AdminGuard } from "@/utils/authGuard";
import FullLoader from "@/components/shared/FullLoader";

/**
 * Wraps an admin page that only means anything for a hospitality company.
 *
 * Three pages needed this and each wrote it out again, with different results.
 * The approval-hierarchy copy rendered its denial *outside* AdminGuard and had
 * no loading state, so on a cold load — token present, userProfile not yet
 * rehydrated from persisted storage — `is_hospitality` read as undefined and a
 * legitimate admin was briefly told they had no access. Waiting for the
 * profile before judging is the whole point of the `loading` branch here.
 */
const HospitalityAdminGate = ({ children, what = "this section" }) => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);

  const hasToken =
    typeof window !== "undefined" && !!window.localStorage.getItem("token");
  const awaitingProfile = userProfile === null && hasToken;
  const hasAccess =
    userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";

  const body = awaitingProfile ? (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "60vh" }}
    >
      <FullLoader />
    </div>
  ) : hasAccess ? (
    children
  ) : (
    <section className="buyer-sec-1">
      <div className="container-fluid">
        <div className="card buyer-card border-0 shadow-sm" style={{ borderRadius: 14 }}>
          <div className="card-body text-center py-5">
            <h4 className="mb-3">Hospitality access not enabled</h4>
            <p className="text-muted mb-4">
              Only hospitality companies can manage {what}. Please contact
              Workwise support to enable hospitality access for your organisation.
            </p>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => router.push("/dashboard/admin")}
            >
              Back to Overview
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  return <AdminGuard>{body}</AdminGuard>;
};

export default HospitalityAdminGate;
