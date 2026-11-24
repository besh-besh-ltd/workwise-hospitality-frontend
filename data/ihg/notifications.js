import { notificationsFor as inboxFor } from "./aggregate";

/**
 * The inbox, built from what actually happened in each area.
 *
 * Every row comes from an area's `activityFor` (PO, MR, RFQ / negotiation,
 * rate contracts), merged in data/ihg/aggregate.js, so clicking a
 * notification always lands on a record that exists. Nothing here is typed
 * independently of the story: an inbox full of plausible noise is worse than
 * an empty one, because the first thing a client does is click a notification.
 *
 * The live routes (/users/notifications/list and /unread-count) are served
 * from lib/mockApi/seed/dashRoutes.js. This module keeps the older
 * `{ read, href }` shape for the legacy callers in listRoutes.js / routes.js.
 */
export const notificationsFor = (personaId, opts = {}) =>
  inboxFor(personaId, opts).map((n) => ({
    ...n,
    read: !!n.is_read,
    href: n.action_url,
    forPersona: [personaId],
  }));

export default notificationsFor;
