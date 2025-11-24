const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const RECAPTCHA_SCRIPT_ID = "recaptcha-v3-script";
const RECAPTCHA_BADGE_SELECTOR = ".grecaptcha-badge";

let recaptchaScriptPromise = null;
let recaptchaConsumerCount = 0;

export const CONTACT_US_RECAPTCHA_ACTION = "contact_us_form";

export const isRecaptchaConfigured = Boolean(recaptchaSiteKey);

export const loadRecaptchaScript = (trackUsage = true) => {
  if (!recaptchaSiteKey || typeof window === "undefined") {
    return Promise.resolve();
  }

  if (trackUsage) {
    recaptchaConsumerCount += 1;
  }

  if (window.grecaptcha) {
    return Promise.resolve();
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise;
  }

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
};

export const unloadRecaptchaScript = () => {
  if (typeof window === "undefined") {
    return;
  }

  recaptchaConsumerCount = Math.max(0, recaptchaConsumerCount - 1);
  if (recaptchaConsumerCount > 0) {
    return;
  }

  const script = document.getElementById(RECAPTCHA_SCRIPT_ID);
  if (script) {
    script.remove();
  }

  document
    .querySelectorAll(RECAPTCHA_BADGE_SELECTOR)
    .forEach((badge) => badge.remove());

  delete window.grecaptcha;
  recaptchaScriptPromise = null;
};

export const executeRecaptcha = async (
  action = CONTACT_US_RECAPTCHA_ACTION
) => {
  if (!recaptchaSiteKey) {
    throw new Error("reCAPTCHA is not configured");
  }

  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA is not ready yet");
  }

  await loadRecaptchaScript(false);

  if (!window.grecaptcha) {
    throw new Error("reCAPTCHA is not ready yet");
  }

  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(recaptchaSiteKey, { action })
        .then(resolve)
        .catch(() => reject(new Error("Unable to verify reCAPTCHA")));
    });
  });
};

