// In-tab signal: "this user just changed an approval". The approval nav badges
// refetch on it immediately instead of waiting for the server's
// `approval:changed` socket frame or the 60 s poll. It carries no data: the
// badges always refetch from the API.

const EVENT_NAME = "ww:approvals-changed";

export const notifyApprovalsChanged = () => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (_) {}
};

export const subscribeApprovalsChanged = (callback) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};
