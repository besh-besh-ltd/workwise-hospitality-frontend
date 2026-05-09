import React from "react";
import CreateRFQ from "@/components/dashboard/buyer/createRFQ/CreateRFQ";
import Head from "next/head";

// The edit-RFQ flow now reuses the CreateRFQ component end-to-end. The URL
// carries `?id=<rfqId>` which CreateRFQ reads as `edit_rfq_id` to switch
// from draft load/save (getDraftById/saveDraft) to RFQ load/save
// (getRFQById/updateRfq). Same UI, same stepper, edit-specific behaviours
// gated on that flag.
const RfqManagementEdit = () => {
    return (
        <>
        <Head>
            <title>Buyer | Edit RFQ</title>
        </Head>
        <section className="sc-pt-80">
            <CreateRFQ />
        </section>
        </>
    )
}

export default RfqManagementEdit;