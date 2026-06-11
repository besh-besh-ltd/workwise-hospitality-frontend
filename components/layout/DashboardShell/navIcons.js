import {
  House,
  Plus,
  Folders,
  Microscope,
  GitCompare,
  Trophy,
  LayoutGrid,
  TruckElectric,
  PieChart,
  Users,
  Building2,
  Package,
  Inbox,
  CreditCard,
  BookOpen,
  Store,
  Bell,
  FileText,
  LayoutDashboard,
  ScrollText,
  FilePlus2,
  ClipboardList,
  ClipboardPlus,
  FileSignature,
  Handshake,
  FileDiff,
  FilePen,
} from "lucide-react";

/**
 * Maps nav item href (from roleMenus in headerConfig.js) to a Lucide icon.
 *
 * Icon picks aim to be *semantic on their own* — a user should grasp the
 * destination from the icon alone, without reading the label. Pairings
 * within a section also stay visually distinct so the rail scans cleanly.
 *
 * Workflow story (RFQs section):
 *   FilePlus2 → Layers → ClipboardCheck → GitCompare → Trophy
 *   (write) → (manage) → (evaluate) → (compare) → (award)
 */
export const NAV_ICONS = {
  // Dashboards — house = "home base".
  "/dashboard/buyer": House,
  "/dashboard/admin": House,
  "/dashboard/management": House,
  "/dashboard/finance": House,
  "/dashboard/engineering": House,
  "/dashboard/vendor": House,

  // Buyer / Management workflow
  // Create RFQ → plus = "new".
  "/dashboard/buyer/start-rfq": Plus,
  // Manage RFQs → folders = "organising many RFQs".
  "/dashboard/buyer/rfq-management": Folders,
  // Technical evaluation → microscope = "close inspection of specs".
  "/dashboard/buyer/technical-evaluation": Microscope,
  // Quote comparison → side-by-side compare arrows.
  "/dashboard/buyer/quote-compare": GitCompare,
  "/dashboard/buyer/quote-comparison": GitCompare,
  // Awarding → trophy = "you've won the bid".
  "/dashboard/buyer/purchase-order": Trophy,

  // Vendors directory (legacy "Add Products" empty-state link).
  "/vendor/all": Store,

  // Purchase Orders (new module). The trio stays semantically distinct:
  // grid overview, delivery tracking, electric truck for the analytics view.
  "/dashboard/buyer/purchase-orders": LayoutGrid,
  "/dashboard/buyer/purchase-orders/tracking": TruckElectric,
  "/dashboard/buyer/purchase-orders/analytics": PieChart,

  // Notifications inbox — shared between buyer and vendor.
  "/dashboard/notifications": Bell,

  // Admin
  "/dashboard/admin/account-management/manage-accounts": Users,
  "/dashboard/admin/hospitality-manager": Building2,

  // Vendor
  "/dashboard/vendor/product-management": Package,
  // Inquiries → inbox tray reads as "incoming items to action".
  "/dashboard/vendor/inquiries-received": Inbox,
  "/dashboard/vendor/subscription": CreditCard,
  // Order book → literal open book.
  "/dashboard/vendor/order-book": BookOpen,

  // Rate Contracts (buyer) — dashboard view, contract list, new wizard.
  "/dashboard/buyer/rate-contracts":        LayoutDashboard,
  "/dashboard/buyer/rate-contracts/all":    ScrollText,
  "/dashboard/buyer/rate-contracts/create": FilePlus2,

  // Material Requisitions (buyer) — dashboard, list, raise-new.
  "/dashboard/buyer/material-requisitions":        LayoutDashboard,
  "/dashboard/buyer/material-requisitions/all":    ClipboardList,
  "/dashboard/buyer/material-requisitions/create": ClipboardPlus,

  // Rate Contracts (vendor) — dashboard, incoming, in-progress, active deals.
  "/dashboard/vendor/rate-contracts":                            LayoutDashboard,
  "/dashboard/vendor/rate-contracts/requests":                   Inbox,
  "/dashboard/vendor/rate-contracts/requests?tab=submitted":     FileSignature,
  "/dashboard/vendor/rate-contracts/requests?tab=awaiting-sign": Handshake,
  "/dashboard/vendor/rate-contracts/active":                     ScrollText,

  // Amendments (vendor) — tracked edits across contracts + raise a new one.
  "/dashboard/vendor/rate-contracts/amendments":         FileDiff,
  "/dashboard/vendor/rate-contracts/amendments/request": FilePen,
};

export const getNavIcon = (href) => NAV_ICONS[href] || FileText;
