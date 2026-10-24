// Online-only stub of the scan-screen outbox. Task D3 replaces the body with a
// real offline queue; callers (receive, mark-out, count screens) already post
// through `submitOrQueue`, so they never change.

/**
 * @param {{kind: string, clientEventId: string, payload: any, send: (payload: any) => Promise<any>}} args
 * @returns {Promise<{queued: false, result: any}>}
 */
export const submitOrQueue = async ({ send, payload }) => {
  const result = await send(payload);
  return { queued: false, result };
};

/** Number of events waiting to sync. Always 0 until the real outbox lands. */
export const usePendingCount = () => 0;
