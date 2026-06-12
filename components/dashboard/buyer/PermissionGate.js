/* ────────────────────────────────────────────────────────────
   PermissionGate — gates a dashboard widget by permission code
   ──────────────────────────────────────────────────────────── */

import React from "react";
import { useHasDashboardWidget } from "@/hooks/useDashboardWidgets";

/**
 * Render `children` only if the current user has the supplied dashboard
 * widget permission for the currently-selected business units.
 *
 * Usage:
 *   <PermissionGate code="dashboard.negotiation_savings">
 *     <NegotiationSavings filters={filters} />
 *   </PermissionGate>
 *
 * Props:
 *   code         (required) — canonical `dashboard.*` widget code.
 *   children     React node — what to render when granted.
 *   fallback     React node — what to render when not granted (default null).
 *   loadingNode  React node — what to render while permissions load.
 *                Default behaviour is to render nothing during load to
 *                avoid flashing widgets that the user shouldn't see.
 */
const PermissionGate = ({ code, children, fallback = null, loadingNode = null }) => {
  const { granted, isLoading } = useHasDashboardWidget(code);
  if (isLoading) return loadingNode;
  return granted ? <>{children}</> : fallback;
};

export default PermissionGate;
