import React from "react";
import ShortLinkRedirect from "@/components/inventory/scan/ShortLinkRedirect";

// Short-link landing for printed QR labels (/s/<t>/<id>). A bare route
// (components/layout/index.js): no marketing header or footer.
const ShortLinkPage = () => <ShortLinkRedirect />;

export default ShortLinkPage;
