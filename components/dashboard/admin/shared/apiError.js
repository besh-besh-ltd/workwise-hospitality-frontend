/**
 * The message the server actually sent, or the caller's fallback.
 *
 * Two envelope shapes reach these handlers. Services in this codebase reject
 * with `{ message: error }` (see the pattern in services/*.js), so the payload
 * sits under `.message.response.data`; a raw axios error puts it under
 * `.response.data`. Handlers that only check one shape silently lose the
 * other.
 *
 * Why generic rather than a named-code branch: the duplicate-role-assignment
 * defect was that `manage-accounts.js` special-cased three codes and every
 * other code — including a 409 whose whole point was its sentence — fell
 * through to "Failed to update user". Enumerating codes is what produced the
 * gap, so prefer the server's own words and keep the fallback for when there
 * genuinely are none.
 */
const payloadOf = (err) => err?.message?.response?.data || err?.response?.data || null;

export const apiErrorMessage = (err, fallback) => {
  const message = payloadOf(err)?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

/** The server's error code, for the cases that really do need to branch. */
apiErrorMessage.codeOf = (err) => payloadOf(err)?.code ?? null;

export default apiErrorMessage;
