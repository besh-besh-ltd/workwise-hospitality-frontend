import React from "react";
import CountDetail from "@/components/inventory/counts/CountDetail";

// `key` resets every bit of state (typed figures, reasons) between counts.
const CountDetailPage = ({ id }) => (id ? <CountDetail key={id} id={id} /> : null);

export default CountDetailPage;
