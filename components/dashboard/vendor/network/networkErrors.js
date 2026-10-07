// Turns a rejected vendor-network call into the text a toast shows.
//
// The backend answers business refusals as { status: 0, message, reason? }.
// Where a `reason` code needs more than the server's terse sentence (what to
// do next), it is explained here; any other refusal shows the server's own
// message, and a transport failure shows the caller's fallback.

import { getApiErrorMessage } from "@/utils/apiError";

const REASON_MESSAGES = {
  NOT_FOUND: "No vendor account matches. Check the email, or pick an account from the suggestions.",
  ALREADY_IN_NETWORK:
    "That vendor account already belongs to a network. It has to leave that network before it can join yours.",
  IS_PRINCIPAL: "That vendor runs its own network, so it can't be linked into yours.",
  INVITE_PENDING: "An invitation to this vendor is already waiting for a reply. Cancel it first to send a new one.",
  LAST_ADMIN: "The network must keep at least one active admin. Make someone else an admin first.",
  PERSON_LIMIT: "Your network has reached its limit of people. Disable someone before inviting more.",
  PERSON_IN_OTHER_ORG: "This person already belongs to another vendor network.",
  INVITE_NOT_ACCEPTED: "This person hasn't accepted the invitation yet. Resend it instead.",
};

/**
 * @param err       the rejected value of a services/vendorNetwork call
 * @param fallback  shown when the server sent no message
 * @param overrides reason → message for the calling screen (a reason can mean
 *                  different things on different screens, e.g. EMAIL_EXISTS)
 */
export function networkErrorMessage(err, fallback, overrides = {}) {
  const reason = err?.response?.data?.reason;
  if (reason && overrides[reason]) return overrides[reason];
  if (reason && REASON_MESSAGES[reason]) return REASON_MESSAGES[reason];
  return getApiErrorMessage(err, fallback);
}

export default networkErrorMessage;
