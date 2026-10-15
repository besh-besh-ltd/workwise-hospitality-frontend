import React from "react";
import VendorPage from "@/components/dashboard/vendor";
import IncomingLinkInvitesBanner from "@/components/dashboard/vendor/network/IncomingLinkInvitesBanner";

const Vendor = () => {
    return (
        <>
            <IncomingLinkInvitesBanner />
            <VendorPage />
        </>
    )
}

export default Vendor;