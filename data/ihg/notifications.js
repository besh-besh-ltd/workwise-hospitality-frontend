import { CATEGORY, contract, mr, negotiation, po, rfq } from "./thread";

/**
 * The inbox, seeded from events the golden thread actually generates.
 *
 * Nothing here is invented independently of the story — every row corresponds
 * to a step you can navigate to. An inbox full of plausible noise is worse
 * than an empty one: the first thing a client does is click a notification,
 * and it has to go somewhere real.
 */
export const notifications = [
  {
    id: "n1",
    title: `${po.ref} needs your approval`,
    message: `Housekeeping linen call-off against ${contract.ref}, raised for InterContinental Marine Drive. Waiting ${po.pendingDays} days.`,
    time: "2 hours ago",
    read: false,
    forPersona: ["finance", "regional"],
    href: `/dashboard/purchase-orders/${po.id}`,
  },
  {
    id: "n2",
    title: "Technical evaluation is open",
    message: `${contract.ref} moved to technical evaluation. 5 vendors under evaluation, 19 evidence documents to read.`,
    time: "Yesterday",
    read: false,
    forPersona: ["purchase", "regional"],
    href: `/dashboard/contracts/${contract.id}/tech-eval`,
  },
  {
    id: "n3",
    title: "Negotiation round 1 is ready to draft",
    message: `${rfq.ref} — 6 of 9 suppliers quoted. Bath Towel 500 GSM has the widest spread at 14.1%.`,
    time: "Yesterday",
    read: false,
    forPersona: ["purchase", "regional"],
    href: `/dashboard/negotiations/${rfq.id}`,
  },
  {
    id: "n4",
    title: "Aarvi Linens flagged on compliance",
    message: "OEKO-TEX Standard 100 lapsed on 31 Mar 2026. They remain on the approved list but are flagged on every RFQ.",
    time: "3 days ago",
    read: true,
    forPersona: ["purchase", "regional", "finance"],
    href: "/dashboard/vendors",
  },
  {
    id: "n5",
    title: `Quotes closed on ${rfq.ref}`,
    message: `Submission window closed. 6 of 9 invited suppliers responded on ${CATEGORY}.`,
    time: "5 days ago",
    read: true,
    forPersona: ["purchase", "regional"],
    href: `/dashboard/rfqs/${rfq.id}`,
  },
  {
    id: "n6",
    title: `${mr.id} converted to an RFQ`,
    message: "Your requisition was consolidated with four other properties and floated as a group RFQ.",
    time: "6 weeks ago",
    read: true,
    forPersona: ["housekeeping"],
    href: `/dashboard/requisitions/${mr.id}`,
  },
];

/** Only what this persona would actually be sent. */
export const notificationsFor = (personaId) =>
  notifications.filter((n) => n.forPersona.includes(personaId));

export default notifications;
