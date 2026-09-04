import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import HospitalityManager from "@/components/dashboard/admin/HospitalityManager";
import { AdminGuard } from "@/utils/authGuard";
import FullLoader from "@/components/shared/FullLoader";

const THEME = {
  primary: "#2E5BA8",
  primaryHover: "#264FA0",
  softBg: "#f2f6ff",
  softBorder: "#dbeafe",
};

const HospitalityManagerPage = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const hasAccess = userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";
  const loading = userProfile === null && !!localStorage.getItem("token");
  const router = useRouter();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
          <FullLoader />
        </div>
      );
    }

    if (!hasAccess) {
      return (
        <section className="buyer-sec-1">
          <div className="container-fluid">
            <div
              className="card buyer-card border-0 shadow-sm"
              style={{
                borderRadius: "14px",
                background: "#fff",
                border: `1px solid ${THEME.softBorder}`,
              }}
            >
              <div className="card-body text-center py-5">
                <h4 className="mb-3">Hospitality access not enabled</h4>
                <p className="text-muted mb-4">
                  Only hospitality companies can manage business unit networks. Please contact Workwise support to enable hospitality access for your organization.
                </p>
                <button
                  className="btn"
                  onClick={() => router.push("/dashboard/admin")}
                  style={{
                    border: `1px solid ${THEME.primary}`,
                    color: THEME.primary,
                    background: THEME.softBg,
                    borderRadius: "10px",
                    padding: "0.55rem 1rem",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = THEME.primary;
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = THEME.softBg;
                    e.currentTarget.style.color = THEME.primary;
                  }}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return <HospitalityManager />;
  };

  return (
    <AdminGuard>
      <Head>
        <title>Hospitality Manager | Admin</title>
      </Head>
      {renderContent()}
    </AdminGuard>
  );
};

export default HospitalityManagerPage;
