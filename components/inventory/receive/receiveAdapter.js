// The calls ReceivePage makes, behind one small interface so the same screen
// runs for a signed-in receiver (drafts, buyer routes) and for a site rep on
// an emailed link (no drafts, X-Receive-Token routes, no prices).
//
// Adapter shape (every function returns the unwrapped payload):
//   getContext(poId, hotelId)          → ReceiveContext
//   createDraft?(input)                → Grn   input: GrnInput + post:false + clientEventId
//   updateDraft?(grnId, input)         → Grn   input: GrnInput + post:false
//   discardDraft?(grnId)               → {deleted:true}
//   post({grnId, input, clientEventId})→ Grn (+ warnings[])
//   uploadAttachment(grnId, file, kind)→ {id, fileName, kind, url}
//   deleteAttachment?(grnId, attId)    → {deleted:true}
//   postKind                           the outbox event kind for post()
// An adapter without createDraft has no server drafts: the receipt lives on
// the device until it is posted in one request, and attachments upload after.

import {
  getReceiveContext,
  createGrn,
  updateGrn,
  postGrn,
  discardGrn,
  uploadGrnAttachment,
  deleteGrnAttachment,
  getTokenReceiveContext,
  postTokenGrn,
  uploadTokenGrnAttachment,
} from "@/services/inventory";

/** Signed-in receiver: buyer routes, server drafts, POST /grn/:id/post. */
export const buyerReceiveAdapter = Object.freeze({
  postKind: "grn.post",
  getContext: (poId, hotelId) => getReceiveContext(poId, hotelId),
  createDraft: (input) => createGrn(input),
  updateDraft: (grnId, input) => updateGrn(grnId, input),
  discardDraft: (grnId) => discardGrn(grnId),
  // The draft was saved just before; posting it by id is replay-safe.
  post: ({ grnId, clientEventId }) => postGrn(grnId, clientEventId),
  uploadAttachment: (grnId, file, kind) => uploadGrnAttachment(grnId, file, kind),
  deleteAttachment: (grnId, attId) => deleteGrnAttachment(grnId, attId),
});

// A link may not set a unit conversion, map a line to a stock item or mark
// out on arrival (C5 refuses those keys even when null), and its hotel is
// always the token's.
const TOKEN_LINE_KEYS_DROPPED = ["uomFactor", "mapToInvItemId", "markOutDepartmentId"];
const tokenInput = (input) => {
  const out = { ...input };
  delete out.hotelId;
  out.lines = (input.lines || []).map((l) => {
    const line = { ...l };
    for (const k of TOKEN_LINE_KEYS_DROPPED) delete line[k];
    return line;
  });
  return out;
};

/**
 * Site rep on a receive link: the token's PO and hotel only, no drafts, one
 * POST /token/grn per receipt (idempotent by clientEventId).
 */
export const createTokenReceiveAdapter = (token) =>
  Object.freeze({
    postKind: "grn.token.post",
    getContext: () => getTokenReceiveContext(token),
    post: ({ input, clientEventId }) => postTokenGrn(token, { ...tokenInput(input), post: true, clientEventId }),
    uploadAttachment: (grnId, file, kind) => uploadTokenGrnAttachment(token, grnId, file, kind),
  });
