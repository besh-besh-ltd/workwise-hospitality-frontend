import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import HospitalityManager from "@/components/dashboard/admin/HospitalityManager";
import { AdminGuard } from "@/utils/authGuard";
import { getProfile } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";

const HospitalityManagerPage = () => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        if (!isMounted) return;
        const profile = response?.data;
        const isHospitality =
          profile?.is_hospitality === 1 ||
          profile?.is_hospitality === "1";
        setHasAccess(isHospitality);
      } catch (error) {
        setHasAccess(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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
            <div className="card buyer-card">
              <div className="card-body text-center py-5">
                <h4 className="mb-3">Hospitality access not enabled</h4>
                <p className="text-muted mb-4">
                  Only hospitality companies can manage hotel networks. Please contact Workwise support to enable hospitality access for your organization.
                </p>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => router.push("/dashboard/admin")}
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



