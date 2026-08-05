// RFQ management page. The listing is now the rate-contracts-aligned, server-
// faceted RfqListPage (its own tabs + filter sidebar). The Create flow stays a
// separate URL tab (?tab=create-rfq) inside the shell.
import { useRouter } from "next/router";
import RfqListPage from "./manageRFQ/RfqListPage";
import CreateRFQ from "./createRFQ/CreateRFQ";
import { TwoPanelPage } from "@/components/layout/DashboardShell";

const RfqManagement = () => {
  const router = useRouter();
  const { tab } = router.query;

  if (tab === "create-rfq") {
    return (
      <TwoPanelPage
        title="New Tender / RFQ"
        subtitle="Define products, vendors, and a timeline for a new procurement request."
      >
        <CreateRFQ />
      </TwoPanelPage>
    );
  }

  return <RfqListPage />;
};

export default RfqManagement;
