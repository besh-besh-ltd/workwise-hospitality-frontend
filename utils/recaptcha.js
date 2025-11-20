const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

export const CONTACT_US_RECAPTCHA_ACTION = "contact_us_form";

export const isRecaptchaConfigured = Boolean(recaptchaSiteKey);

export const executeRecaptcha = (
  action = CONTACT_US_RECAPTCHA_ACTION
) => {
  return new Promise((resolve, reject) => {
    if (!recaptchaSiteKey) {
      reject(new Error("reCAPTCHA is not configured"));
      return;
    }

    if (typeof window === "undefined" || !window.grecaptcha) {
      reject(new Error("reCAPTCHA is not ready yet"));
      return;
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(recaptchaSiteKey, { action })
        .then(resolve)
        .catch(() => reject(new Error("Unable to verify reCAPTCHA")));
    });
  });
};

