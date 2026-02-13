import { useState, useEffect } from "react";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";
import ApprovalHierarchyPage from "@/components/dashboard/admin/hospitality-manager/approval-hierarchy";
import { getProfile } from "@/services/Auth";

const ApprovalHierarchyPageRoute = () => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await getProfile();
        const profile = response?.data;
        const isHospitalityCompany =
          profile?.is_hospitality === 1 || profile?.is_hospitality === "1";
        setHasAccess(!!isHospitalityCompany);
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="card buyer-card">
            <div className="card-body text-center py-5">
              <h4 className="mb-3">Hospitality access not enabled</h4>
              <p className="text-muted mb-4">
                Only hospitality companies can manage approval hierarchies. Please contact Workwise support to enable hospitality access for your organization.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <AdminGuard>
      <Head>
        <title>Approval Hierarchy | Hospitality Manager</title>
      </Head>
      <ApprovalHierarchyPage />
    </AdminGuard>
  );
};

export default ApprovalHierarchyPageRoute;

