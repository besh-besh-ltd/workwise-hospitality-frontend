// The service calls ReceivePage and its draft session make, in one place.
// Buyer only: the site-rep token flow is TokenReceivePage (task D5), which
// never posts through the outbox and never keeps anything in IndexedDB.
//
// Every function returns the unwrapped payload:
//   getContext(poId, hotelId)          → ReceiveContext
//   createDraft(input)                 → Grn   input: GrnInput + post:false + clientEventId
//   updateDraft(grnId, input)          → Grn   input: GrnInput (no poId) + post:false + clientEventId
//   discardDraft(grnId)                → {deleted:true}
//   getGrn(grnId)                      → Grn   (what became of a draft the device remembers)
//   post({grnId, clientEventId, input})→ Grn   ONE request: GrnInput + post:true + clientEventId.
//                                              A fresh post carries warnings[]; a replayed
//                                              clientEventId answers with the original GRN
//                                              (no warnings key).
//   uploadAttachment(grnId, file, kind)→ {id, fileName, kind, url}
//   deleteAttachment(grnId, attId)     → {deleted:true}

import {
  getReceiveContext,
  createGrn,
  updateGrn,
  discardGrn,
  getGrn,
  uploadGrnAttachment,
  deleteGrnAttachment,
} from "@/services/inventory";

/** Outbox kind for a receipt post. */
export const GRN_POST_KIND = "grn_post";

/**
 * The `grn_post` sender (task D3 registers it for queued events). Payload
 * `{grnId|null, clientEventId, input}`: one POST /grn {post:true}. The server
 * posts the draft holding that clientEventId, creates and posts a new receipt
 * if there is none, and replays the original if the key was already posted,
 * so a retry never posts twice and never trips over "only a draft can be
 * edited".
 */
export const sendGrnPost = ({ clientEventId, input }) => createGrn({ ...input, post: true, clientEventId });

/** Signed-in receiver: buyer routes, server drafts. */
export const buyerReceiveAdapter = Object.freeze({
  getContext: (poId, hotelId) => getReceiveContext(poId, hotelId),
  createDraft: (input) => createGrn(input),
  updateDraft: (grnId, input) => updateGrn(grnId, input),
  discardDraft: (grnId) => discardGrn(grnId),
  getGrn: (grnId) => getGrn(grnId),
  post: sendGrnPost,
  uploadAttachment: (grnId, file, kind) => uploadGrnAttachment(grnId, file, kind),
  deleteAttachment: (grnId, attId) => deleteGrnAttachment(grnId, attId),
});
