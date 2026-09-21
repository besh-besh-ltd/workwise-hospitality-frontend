// Turn anything a rejected service call can produce into a string safe for JSX.
//
// Services in services/*.js reject as `reject({ message: error })`, wrapping the
// whole AxiosError. That hides `error.response`, so the common consumer line
// `err?.response?.data?.message || err?.message` yields the AxiosError OBJECT.
// React throws on an object child, and the app-level ErrorBoundary in
// pages/_app.js replaces the page with "Something went wrong".
//
// Read both shapes — wrapped and unwrapped — and always return a string.

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

const pickString = (value) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

// The server's own message is the only text worth showing a user. Axios'
// `.message` ("Network Error", "timeout of 30000ms exceeded") is transport
// noise, so it is deliberately not surfaced.
const messageFromError = (err) => {
  if (!err) return null;
  if (typeof err === "string") return pickString(err);

  const serverMessage =
    pickString(err?.response?.data?.message) || pickString(err?.data?.message);
  if (serverMessage) return serverMessage;

  if (err?.isAxiosError) return null;
  return pickString(err?.message);
};

export const getApiErrorMessage = (err, fallback = DEFAULT_MESSAGE) => {
  const safeFallback = pickString(fallback) || DEFAULT_MESSAGE;

  const direct = messageFromError(err);
  if (direct) return direct;

  if (err?.isAxiosError) return safeFallback;

  return messageFromError(err?.message) || safeFallback;
};

export default getApiErrorMessage;
