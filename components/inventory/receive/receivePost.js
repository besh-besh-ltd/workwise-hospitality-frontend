// What a receipt post's answer means. Every post is one request keyed by the
// session's clientEventId; the server replays a key it has already posted.
// A replay is our own earlier attempt only when that attempt's reply was lost
// AND nothing was edited since; otherwise the receipt on the screen is not the
// one that was posted, and showing "Receipt posted" would be a false success
// (and the entries would be thrown away).

import { fmtQty, fmtQtyUnit } from "./receiveUtils";

/** A post answer may be the Grn, or {grn} from an outbox that wraps it. */
export const postedGrnOf = (result) =>
  result && result.id == null && result.grn && typeof result.grn === "object" ? result.grn : result;

/** The server adds warnings[] only when this request posted; a replay has none. */
export const isFreshPost = (grn) => Array.isArray(grn?.warnings);

/**
 * A replayed (or otherwise found) posted GRN for the session key:
 *   "ours"    the reply to our own attempt was lost; this is that receipt.
 *   "earlier" posted before (another session, device or tab, or before the
 *             entries were changed): keep the entries, take a new key, say so.
 *
 * @param {object}  args
 * @param {object}  args.grn             the posted GRN the key belongs to
 * @param {number|undefined} args.lostAtVersion  edit version when a post with
 *                                       this key last ended with no answer
 * @param {number}  args.editVersion     the form's edit version now
 * @param {boolean} args.keyMintedHere   the key was created on this page load
 * @param {number}  args.pageLoadedAt    ms epoch of this page load
 */
export const replayVerdict = ({ grn, lostAtVersion, editVersion, keyMintedHere, pageLoadedAt }) => {
  if (lostAtVersion === undefined || lostAtVersion !== editVersion) return "earlier";
  // A key restored from the device (or a draft) may have been posted in an
  // earlier session; this page's own attempts post after it loaded. Only
  // non-minted keys are dated, so a skewed device clock can't misfile ours.
  if (!keyMintedHere) {
    const at = Date.parse(grn?.postedAt || "");
    if (Number.isFinite(at) && at < pageLoadedAt) return "earlier";
  }
  return "ours";
};

/** The notice for an "earlier" verdict. */
export const earlierPostMessage = (grn) =>
  `This receipt was already posted${grn?.grnNumber ? ` as ${grn.grnNumber}` : ""}. ` +
  "Your entries are still here: check that GRN before posting them again.";

/**
 * What the form shows for a refused or failed post. Returns any of
 *   {lineErrors, formError, retry, uomPrompt, blocked:{reason, message}}.
 * `info` is errorInfo(err); `network` is isNetworkError(err).
 */
export const postErrorAction = (info, { network, lineById, canSetupItems }) => {
  const d = info.details || {};
  const lineId = d.poLineId != null ? Number(d.poLineId) : null;
  const line = lineId != null ? lineById.get(lineId) : null;

  if (info.code === "OVER_RECEIPT" && line) {
    const asked = d.requested != null ? `; this receipt has ${fmtQty(d.requested)}` : "";
    return {
      lineErrors: { [lineId]: `Max acceptable ${fmtQtyUnit(d.maxAcceptable, line.unit)} at this hotel${asked}` },
      formError: "One line is more than this PO allows. Fix it, then post again.",
    };
  }
  if (info.code === "VALIDATION" && d.code_detail === "UOM_FACTOR_REQUIRED" && line) {
    // Without inventory.update the server's message says
    // who can set it ("Ask the buyer to set the unit conversion for …").
    return canSetupItems
      ? { uomPrompt: { mode: "required", poLineId: lineId, poUnit: d.poUnit, stockUom: d.stockUom, thenPost: true } }
      : { lineErrors: { [lineId]: info.message } };
  }
  if (info.code === "VALIDATION" && d.code_detail === "UOM_FACTOR_MISMATCH" && line) {
    return {
      uomPrompt: {
        mode: "mismatch", poLineId: lineId, currentFactor: d.currentFactor, suppliedFactor: d.suppliedFactor, thenPost: true,
      },
    };
  }
  if (info.code === "CONFLICT" && d.reason === "PO_NOT_RECEIVABLE") {
    const rs = d.receiptStatus;
    return { blocked: { reason: rs === "received" || rs === "closed_short" ? rs : "not_ready", message: info.message } };
  }
  if (line) return { lineErrors: { [lineId]: info.message } };
  if (network) {
    return {
      formError:
        "The connection dropped before the server answered. Your entries are kept: retry when you have signal. " +
        "A receipt is never recorded twice.",
      retry: true,
    };
  }
  return { formError: info.message };
};
