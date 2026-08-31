import Head from "next/head";
import HospitalityAdminGate from "@/components/dashboard/admin/shared/HospitalityAdminGate";
import ApprovalHierarchyPage from "@/components/dashboard/admin/hospitality-manager/approval-hierarchy";

/**
 * Kept as a route because ProcessScopeErrorBanner deep-links here and admins
 * have it bookmarked. The discoverable way in is now /dashboard/admin/approvals.
 */
const ApprovalHierarchyPageRoute = () => (
  <HospitalityAdminGate what="approval hierarchies">
    <Head>
      <title>Approval Hierarchy | Admin</title>
    </Head>
    <ApprovalHierarchyPage />
  </HospitalityAdminGate>
);

export default ApprovalHierarchyPageRoute;
