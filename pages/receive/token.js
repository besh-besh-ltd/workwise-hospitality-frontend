import React from "react";
import TokenReceivePage from "@/components/inventory/receive/TokenReceivePage";

// Site-rep receive link (/receive/token?t=<token>), opened from the buyer's
// email by someone with no account. A bare route (components/layout/index.js):
// no site header, no dashboard shell, no login. The server sends it with
// Referrer-Policy: no-referrer (next.config.js), and legacy
// /dashboard/buyer/purchase-order/grn?token= links redirect here.
const SiteRepReceivePage = () => <TokenReceivePage />;

export default SiteRepReceivePage;
