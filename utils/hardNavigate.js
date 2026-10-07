/**
 * Full page load to `url` (window.location.assign), discarding every page
 * state and in-memory cache. Its own module because jsdom's window.location
 * is non-configurable, so tests mock this instead.
 */
export const hardNavigate = (url) => {
  window.location.assign(url);
};
