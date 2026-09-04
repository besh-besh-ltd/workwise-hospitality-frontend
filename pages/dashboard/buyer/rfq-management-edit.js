import React from "react";
import CreateRFQ from "@/components/dashboard/buyer/createRFQ/CreateRFQ";
import { TwoPanelPage } from "@/components/layout/DashboardShell";
import Head from "next/head";

// The edit-RFQ flow now reuses the CreateRFQ component end-to-end. The URL
// carries `?id=<rfqId>` which CreateRFQ reads as `edit_rfq_id` to switch
// from draft load/save (getDraftById/saveDraft) to RFQ load/save
// (getRFQById/updateRfq). Same UI, same stepper, edit-specific behaviours
// gated on that flag.
//
// We wrap CreateRFQ in TwoPanelPage so the chrome (title bar, paddings,
// responsive layout) matches the rest of the refactored dashboard.
const RfqManagementEdit = () => {
    return (
        <>
        <Head>
            <title>Buyer | Edit RFQ</title>
        </Head>
        <TwoPanelPage
            title="Edit Tender / RFQ"
            subtitle="Update products, vendors, timeline, and other details."
        >
            <CreateRFQ />
        </TwoPanelPage>
        </>
    )
}

export default RfqManagementEdit;
