export const ANNOUNCEMENT_TEXT =
  "Now expanding Internationally \u2014 meet us at Intersec Dubai 2026 from 12\u201314 January, Stand no. SR-D24, Dubai World Trade Centre";

export const initialMainNavs = [
  "/",
  "/aboutus",
  "/contactus",
  "/for-vendors",
  "/vendor/all",
  "/hotel-vendor",
  "/solutions",
  "/blogs",
  "/validate-otp",
  "/forget-password",
  "/privacypolicy",
  "/terms-of-use",
  "/products",
  "/dashboard/vendor/inquiries-details",
  "/dashboard/buyer/rfq-management-vendor/vendor-profile",
  "/newHomePageDesign",
  "/ai-tools",
  "/ai-tools/boq-simplification",
  "/ai-tools/cost-estimation",
  "/ai-tools/tender-summary",
  "/ai-tools/technical-summary",
  "/insights",
  "/insights/events",
  "/insights/news",
  "/insights/procurement-guide",
  "/insights/ai-procurement",
  "/insights/epc-trends",
  "/modules",
  "/modules/boq",
  "/modules/rfq",
  "/modules/payments",
  "/modules/evaluation",
  "/modules/negotiation",
  "/modules/vendors",
  "/work-with-us",
  "/work-with-us/TeamTimeline",
  "/work-with-us/careers",
];

export const roleMenus = {
  admin: [
    { href: "/dashboard/admin/editprofile", label: "Profile", targetMenu: "popup", icon: "person" },
    { href: "/dashboard/admin", label: "Dashboard", targetMenu: "nav", section: "Main" },
    { href: "/dashboard/admin/account-management/manage-accounts", label: "User Management", targetMenu: "nav", section: "Management" },
    { href: "/dashboard/admin/hospitality-manager", label: "Hospitality Network", targetMenu: "nav", section: "Management" },
  ],
  buyer: [
    { href: "/dashboard/buyer", label: "Dashboard", targetMenu: "nav", section: null },
    // RFQs — the lifecycle page now drives Technical / Comparison / Awarding
    // in-page, so the rail keeps just the two entry points.
    { href: "/dashboard/buyer/rfq-management", label: "All RFQs", targetMenu: "nav", section: "RFQs" },
    { href: "/dashboard/buyer/start-rfq", label: "Create New", targetMenu: "nav", section: "RFQs" },
    // Negotiation — its own section directly below RFQs.
    { href: "/dashboard/buyer/negotiation", label: "All Negotiations", targetMenu: "nav", section: "Negotiation", isNew: true },
    { href: "/dashboard/buyer/negotiation/create", label: "Create New", targetMenu: "nav", section: "Negotiation", isNew: true },
    { href: "/dashboard/buyer/purchase-orders", label: "Dashboard", targetMenu: "nav", section: "Purchase Orders", isNew: true },
    { href: "/dashboard/buyer/purchase-orders/tracking", label: "Tracking", targetMenu: "nav", section: "Purchase Orders", isNew: true },
    { href: "/dashboard/buyer/purchase-orders/analytics", label: "Analytics", targetMenu: "nav", section: "Purchase Orders", isNew: true },
    // ── Rate Contracts (ARC v2)
    { href: "/dashboard/buyer/rate-contracts",        label: "Dashboard",      targetMenu: "nav", section: "Rate Contracts", isNew: true },
    { href: "/dashboard/buyer/rate-contracts/all",    label: "All Contracts",  targetMenu: "nav", section: "Rate Contracts", isNew: true },
    { href: "/dashboard/buyer/rate-contracts/create", label: "Create New",     targetMenu: "nav", section: "Rate Contracts", isNew: true },
    // ── Material Requisitions
    { href: "/dashboard/buyer/material-requisitions",        label: "Dashboard",   targetMenu: "nav", section: "Material Requisitions", isNew: true },
    { href: "/dashboard/buyer/material-requisitions/all",    label: "All MRs",     targetMenu: "nav", section: "Material Requisitions", isNew: true },
    { href: "/dashboard/buyer/material-requisitions/create", label: "Raise New",   targetMenu: "nav", section: "Material Requisitions", isNew: true },
    { href: "/dashboard/notifications", label: "Notifications", targetMenu: "nav", section: "Inbox" },
    { href: "/dashboard/buyer/editprofile", label: "Profile", targetMenu: "popup", icon: "person" },
  ],
  vendor: [
    { href: "/dashboard/vendor/", label: "Dashboard", targetMenu: "nav", section: "Main" },
    { href: "/dashboard/vendor/editprofile", label: "Profile", targetMenu: "popup", icon: "person" },
    { href: "/dashboard/vendor/product-management", label: "Product Management", targetMenu: "nav", requiresSubscription: true, section: "Catalogue" },
    { href: "/dashboard/vendor/inquiries-received", label: "Received Inquiries", targetMenu: "nav", requiresSubscription: true, section: "Orders" },
    // ── Purchase Orders (vendor portal)
    { href: "/dashboard/vendor/purchase-orders", label: "Dashboard", targetMenu: "nav", requiresSubscription: true, section: "Purchase Orders", isNew: true },
    { href: "/dashboard/vendor/purchase-orders/orders", label: "Orders", targetMenu: "nav", requiresSubscription: true, section: "Purchase Orders", isNew: true },
    // ── Rate Contracts (ARC v2 — vendor portal)
    { href: "/dashboard/vendor/rate-contracts",                            label: "Dashboard",          targetMenu: "nav", section: "Rate Contracts", isNew: true },
    { href: "/dashboard/vendor/rate-contracts/requests",                   label: "Received Requests",  targetMenu: "nav", section: "Rate Contracts", isNew: true },
    { href: "/dashboard/vendor/rate-contracts/requests?tab=submitted",     label: "Submitted Quotes",   targetMenu: "nav", section: "Rate Contracts", isNew: true },
    { href: "/dashboard/vendor/rate-contracts/requests?tab=awaiting-sign", label: "Pending Acceptance", targetMenu: "nav", section: "Rate Contracts", isNew: true },
    { href: "/dashboard/vendor/rate-contracts/active",                     label: "Active Contracts",   targetMenu: "nav", section: "Rate Contracts", isNew: true },
    // ── Amendments (ARC v2 — vendor portal)
    { href: "/dashboard/vendor/rate-contracts/amendments",                 label: "My Amendments",      targetMenu: "nav", section: "Amendments", isNew: true },
    { href: "/dashboard/vendor/rate-contracts/amendments/request",         label: "Request Amendment",  targetMenu: "nav", section: "Amendments", isNew: true },
    { href: "/dashboard/vendor/subscription", label: "Subscription", targetMenu: "nav", section: "Account" },
    { href: "/dashboard/notifications", label: "Notifications", targetMenu: "nav", section: "Inbox" },
  ],
};

export const websiteMenu = [
  {
    label: "Our Offerings",
    type: "dropdown",
    options: [
      { label: "BOQ Understanding & Simplification", href: "/modules/boq" },
      { label: "RFQ Creation & Management", href: "/modules/rfq" },
      { label: "Supplier Discovery & Vendor Management", href: "/modules/vendors" },
      { label: "Technical & Commercial Evaluation", href: "/modules/evaluation" },
      { label: "Negotiation Management", href: "/modules/negotiation" },
      { label: "PO & Payment Lifecycle Management", href: "/modules/payments" },
    ],
  },
  {
    label: "Who We Serve",
    type: "dropdown",
    options: [
      {
        label: "Stakeholders",
        type: "nested-dropdown",
        options: [
          { label: "EPCs / Contractors", href: "/who-we-serve/stakeholders/epcs" },
          { label: "Turnkey Project Firms", href: "/who-we-serve/stakeholders/turnkey" },
          { label: "Project Consultants", href: "/who-we-serve/stakeholders/consultants" },
          { label: "Industrial Clients", href: "/who-we-serve/stakeholders/industrial-clients" },
          { label: "Vendors & OEMs", href: "/for-vendors" },
        ],
      },
      {
        label: "Industries We Serve",
        type: "nested-dropdown",
        options: [
          { label: "Power", href: "/who-we-serve/industries/power" },
          { label: "Energy", href: "/who-we-serve/industries/energy" },
          { label: "Petrochemical & Chemical", href: "/who-we-serve/industries/petrochemical" },
          { label: "Steel & Cement", href: "/who-we-serve/industries/steel-cement" },
          { label: "Infrastructure", href: "/who-we-serve/industries/infrastructure" },
          { label: "Heavy Engineering & Machine Tools", href: "/who-we-serve/industries/heavy-equipment" },
          { label: "Marine & Mining", href: "/who-we-serve/industries/marine-mining" },
        ],
      },
      {
        label: "Disciplines We Cover",
        type: "nested-dropdown",
        options: [
          { label: "Electrical", href: "/solutions/electrical" },
          { label: "Mechanical", href: "/solutions/mechanical" },
          { label: "Civil", href: "/solutions/civil" },
          { label: "HVAC", href: "/solutions/hvac" },
          { label: "Fire & Safety", href: "/solutions/fire-engineering" },
          { label: "Chemical", href: "/solutions/chemical" },
        ],
      },
    ],
  },
  {
    label: "Tools",
    type: "dropdown",
    options: [
      { label: "Vendor Discovery", href: "/vendor/all" },
      { label: "BOQ Simplifier", href: "/ai-tools/boq-simplification" },
      { label: "Project Cost Estimator", href: "/ai-tools/cost-estimation" },
      { label: "Tender Summary", href: "/ai-tools/tender-summary" },
      { label: "Technical Document Summary", href: "/ai-tools/technical-summary" },
    ],
  },
  {
    label: "Insights & Resources",
    type: "dropdown",
    options: [
      { label: "Blogs", href: "https://letsworkwise.com/blog/", external: true },
      { label: "Events", href: "/insights/events" },
      { label: "Procurement Guide for Project & Purchase Managers", href: "/insights/procurement-guide" },
      { label: "AI in Procurement - Use Cases", href: "javascript:void(0)", upcoming: true },
      { label: "Trends in EPC Procurement", href: "/insights/epc-trends" },
      { label: "Workwise in News", href: "/insights/news" },
    ],
  },
  {
    label: "Work With Us",
    type: "dropdown",
    options: [
      { label: "Meet the Team", href: "/work-with-us/TeamTimeline" },
      { label: "We are hiring!", href: "/work-with-us/careers" },
      { label: "Earn With Us", href: "/earn-with-us/EarnWithUs" },
      { label: "Contact Us", href: "/contactus" },
    ],
  },
  {
    label: "Pricing",
    type: "dropdown",
    options: [
      { label: "Buyer pricing", href: "/pricing", action: "buyer-pricing" },
      { label: "Supplier plans", href: "/pricing", action: "supplier-pricing" },
      { label: "Claim Pilot Project Access for Free", href: "/pilot-project" },
    ],
  },
];
