// Overview stage — embeds the existing full RFQ detail component (items,
// vendors, documents, edit-history + close/withdraw actions) so no existing
// functionality is lost in Phase 1. It reads ?id= from the router (same route
// as the shell). Phase 2 extracts/trims this (incl. dropping the now-redundant
// RFQLifecycleJourneyV2 right-rail, replaced by the horizontal timeline).
import RfqManagementDetailsPage from "@/components/dashboard/buyer/rfq-management-details";

export default function OverviewStage() {
  return <RfqManagementDetailsPage />;
}
