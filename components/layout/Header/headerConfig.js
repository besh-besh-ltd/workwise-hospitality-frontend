export const ANNOUNCEMENT_TEXT =
  "Now expanding Internationally \u2014 meet us at Intersec Dubai 2026 from 12\u201314 January, Stand no. SR-D24, Dubai World Trade Centre";

export const initialMainNavs = [
  "/",
  "/aboutus",
  "/contactus",
  "/for-vendors",
  "/vendor/all",
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
  // Company admin rail. Each destination answers one question an admin
  // actually has, in the order they tend to ask it: is anything wrong right
  // now (Overview), what does my company look like in here (Organisation),
  // who has an account (People), what can each role do (Access), and who
  // signs off on what (Approvals).
  //
  // Approvals used to have no entry at all — the approval matrix, which
  // decides who authorises spend, was reachable only by drilling into a
  // company and then a unit. That is the highest-consequence screen in the
  // product and it was the hardest to find.
  //
  // The hrefs deliberately keep their older paths even where the label
  // changed: LoginContainer and ProcessScopeErrorBanner navigate to them by
  // path, and admins have them bookmarked. Renaming the URL buys nothing.
  admin: [
    { href: "/dashboard/admin/editprofile", label: "Profile", targetMenu: "popup", icon: "person" },
    { href: "/dashboard/admin", label: "Overview", targetMenu: "nav", section: "Main" },
    { href: "/dashboard/admin/hospitality-manager", label: "Organisation", targetMenu: "nav", section: "Manage", hospitalityOnly: true },
    { href: "/dashboard/admin/account-management/manage-accounts", label: "People", targetMenu: "nav", section: "Manage" },
    { href: "/dashboard/admin/access", label: "Access", targetMenu: "nav", section: "Manage" },
    { href: "/dashboard/admin/approvals", label: "Approvals", targetMenu: "nav", section: "Manage", hospitalityOnly: true },
  ],
  // Buyer rail — grouped by procure-to-pay phase (Sourcing → Contracts →
  // Requisition & Orders), in lifecycle order. `group` is the phase header;
  // `section` is the collapsible module under it.
  buyer: [
    { href: "/dashboard/buyer", label: "Dashboard", targetMenu: "nav", group: null, section: null },

    // ── SOURCING — solicit & compare competitive bids
    { href: "/dashboard/buyer/rfq-management", label: "All RFQs",    targetMenu: "nav", group: "Sourcing", section: "RFQs" },
    { href: "/dashboard/buyer/start-rfq",      label: "Create New",  targetMenu: "nav", group: "Sourcing", section: "RFQs" },
    { href: "/dashboard/buyer/negotiation",        label: "All Negotiations", targetMenu: "nav", group: "Sourcing", section: "Negotiations" },
    { href: "/dashboard/buyer/negotiation/create", label: "Create New",       targetMenu: "nav", group: "Sourcing", section: "Negotiations" },

    // ── CONTRACTS — recurring rate agreements
    { href: "/dashboard/buyer/rate-contracts",        label: "Dashboard",     targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },
    { href: "/dashboard/buyer/rate-contracts/all",    label: "All Contracts", targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },
    { href: "/dashboard/buyer/rate-contracts/create", label: "Create New",    targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },

    // ── REQUISITION & ORDERS — raise demand, issue & track orders
    { href: "/dashboard/buyer/material-requisitions",        label: "Dashboard", targetMenu: "nav", group: "Requisition & Orders", section: "Material Requisitions" },
    { href: "/dashboard/buyer/material-requisitions/all",    label: "All MRs",   targetMenu: "nav", group: "Requisition & Orders", section: "Material Requisitions" },
    { href: "/dashboard/buyer/material-requisitions/create", label: "Raise New", targetMenu: "nav", group: "Requisition & Orders", section: "Material Requisitions" },
    { href: "/dashboard/buyer/purchase-orders",          label: "Dashboard", targetMenu: "nav", group: "Requisition & Orders", section: "Purchase Orders" },
    { href: "/dashboard/buyer/purchase-orders/tracking", label: "Tracking",  targetMenu: "nav", group: "Requisition & Orders", section: "Purchase Orders" },
    { href: "/dashboard/buyer/purchase-orders/analytics",label: "Analytics", targetMenu: "nav", group: "Requisition & Orders", section: "Purchase Orders" },

    // ── INBOX
    { href: "/dashboard/notifications", label: "Notifications", targetMenu: "nav", group: "Inbox", section: null },
    { href: "/dashboard/buyer/editprofile", label: "Profile", targetMenu: "popup", icon: "person" },
  ],
  // Vendor rail — grouped by the supplier's goals: win work → fulfil → get paid.
  vendor: [
    { href: "/dashboard/vendor/", label: "Dashboard", targetMenu: "nav", group: null, section: null },

    // ── RFQs — demand to quote (Sr 32: split out of former "Opportunities")
    { href: "/dashboard/vendor/inquiries-received", label: "Received Inquiries", targetMenu: "nav", requiresSubscription: true, group: "RFQs", section: null },

    // ── CONTRACTS — won rate agreements (+ Sr 30(a): Received Requests /
    // Submitted Quotes moved in here, ordered FIRST so "Received" precedes
    // everything else in the group; keep the "Rate Contracts" section items
    // contiguous — do not interleave "Amendments" between them.)
    { href: "/dashboard/vendor/rate-contracts/requests",               label: "Received Requests", targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },
    { href: "/dashboard/vendor/rate-contracts/requests?tab=submitted", label: "Submitted Quotes",  targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },
    { href: "/dashboard/vendor/rate-contracts",                            label: "Dashboard",          targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },
    { href: "/dashboard/vendor/rate-contracts/active",                     label: "Active Contracts",   targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },
    { href: "/dashboard/vendor/rate-contracts/requests?tab=awaiting-sign", label: "Pending Acceptance", targetMenu: "nav", group: "Contracts", section: "Rate Contracts" },
    { href: "/dashboard/vendor/rate-contracts/amendments",         label: "My Amendments",     targetMenu: "nav", group: "Contracts", section: "Amendments" },
    { href: "/dashboard/vendor/rate-contracts/amendments/request", label: "Request Amendment", targetMenu: "nav", group: "Contracts", section: "Amendments" },

    // ── ORDERS — fulfil purchase orders
    { href: "/dashboard/vendor/purchase-orders",        label: "Dashboard", targetMenu: "nav", requiresSubscription: true, group: "Orders", section: "Purchase Orders" },
    { href: "/dashboard/vendor/purchase-orders/orders", label: "Orders",    targetMenu: "nav", requiresSubscription: true, group: "Orders", section: "Purchase Orders" },

    // ── CATALOGUE
    { href: "/dashboard/vendor/product-management", label: "Product Management", targetMenu: "nav", requiresSubscription: true, group: "Catalogue", section: null },

    // ── ACCOUNT
    { href: "/dashboard/vendor/subscription", label: "Subscription",  targetMenu: "nav", group: "Account", section: null },
    { href: "/dashboard/notifications",       label: "Notifications", targetMenu: "nav", group: "Account", section: null },
    { href: "/dashboard/vendor/editprofile", label: "Profile", targetMenu: "popup", icon: "person" },
  ],
};

/**
 * The nav a given user should actually see.
 *
 * Some admin destinations only mean anything for a hospitality company —
 * Organisation and Approvals are both built on the company/hotel hierarchy.
 * This used to be expressed as `item.href !== "/dashboard/admin/hospitality-manager"`
 * duplicated across SideNav, MobileNav and Header, which meant every new
 * hospitality-only entry had to be remembered in three places. Items now
 * declare `hospitalityOnly` and the rule lives here once.
 */
export const visibleRoleMenu = (currentUserType, { isHospitalityCompany } = {}) => {
  const baseMenu = roleMenus[currentUserType] || [];
  if (isHospitalityCompany) return baseMenu;
  return baseMenu.filter((item) => !item.hospitalityOnly);
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
