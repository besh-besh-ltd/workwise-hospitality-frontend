import NotificationsPage from "@/components/dashboard/shared/NotificationsPage";

// Mounted under /dashboard/* so the DashboardShell wraps the page (sidebar +
// topbar render automatically). The page component itself is shared between
// buyer and vendor — only the surrounding shell differs (driven by the
// stored current-user-type).
export default function DashboardNotifications() {
  return <NotificationsPage />;
}
