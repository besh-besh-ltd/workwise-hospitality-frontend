import {
  LayoutDashboard,
  FileText,
  Scale,
  BarChart3,
  ShoppingCart,
  Users,
  FolderKanban,
  Package,
  CreditCard,
  ClipboardList,
  Building2,
  Briefcase,
  ReceiptText,
  Truck,
  PieChart,
} from "lucide-react";

/**
 * Maps nav item href (from roleMenus in headerConfig.js) to a Lucide icon.
 * Kept here so adding/renaming a nav link only requires updating this map.
 */
export const NAV_ICONS = {
  // Dashboards
  "/dashboard/buyer": LayoutDashboard,
  "/dashboard/admin": LayoutDashboard,
  "/dashboard/management": LayoutDashboard,
  "/dashboard/finance": LayoutDashboard,
  "/dashboard/engineering": LayoutDashboard,
  "/dashboard/vendor": LayoutDashboard,

  // Buyer / Management workflow
  "/dashboard/buyer/start-rfq": FileText,
  "/vendor/all": FileText,
  "/dashboard/buyer/rfq-management": FolderKanban,
  "/dashboard/buyer/technical-evaluation": Scale,
  "/dashboard/buyer/quote-compare": BarChart3,
  "/dashboard/buyer/purchase-order": ShoppingCart,

  // Purchase Orders (new module)
  "/dashboard/buyer/purchase-orders": ReceiptText,
  "/dashboard/buyer/purchase-orders/tracking": Truck,
  "/dashboard/buyer/purchase-orders/analytics": PieChart,

  // Admin
  "/dashboard/admin/account-management/manage-accounts": Users,
  "/dashboard/admin/hospitality-manager": Building2,

  // Vendor
  "/dashboard/vendor/product-management": Package,
  "/dashboard/vendor/inquiries-received": ClipboardList,
  "/dashboard/vendor/subscription": CreditCard,
  "/dashboard/vendor/order-book": Briefcase,
};

export const getNavIcon = (href) => NAV_ICONS[href] || LayoutDashboard;
