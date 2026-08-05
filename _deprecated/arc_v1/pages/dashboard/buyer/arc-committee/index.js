import React from "react";
import Head from "next/head";
import ArcCommittee from "@/components/dashboard/buyer/arc-committee";

const ArcCommitteePage = () => {
    return (
        <>
            <Head>
                <title>Workwise | ARC Committee Review</title>
            </Head>
            <ArcCommittee />
        </>
    )
}

export default ArcCommitteePage;

