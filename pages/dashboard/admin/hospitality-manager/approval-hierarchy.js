import Head from "next/head";
import { useSelector } from "react-redux";
import { AdminGuard } from "@/utils/authGuard";
import ApprovalHierarchyPage from "@/components/dashboard/admin/hospitality-manager/approval-hierarchy";

const ApprovalHierarchyPageRoute = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const hasAccess = userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";

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
