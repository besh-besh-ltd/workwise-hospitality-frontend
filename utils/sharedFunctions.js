import { useState, useEffect } from 'react';

const ROLE_DASHBOARD_SEGMENTS = new Set([
  'buyer', 'vendor', 'admin', 'management', 'engineering', 'finance'
]);

const DEFAULT_DASHBOARD_BY_USER_TYPE = {
  buyer: '/dashboard/buyer',
  vendor: '/dashboard/vendor',
  admin: '/dashboard/admin',
  management: '/dashboard/management',
  engineering: '/dashboard/engineering',
  finance: '/dashboard/finance',
};

/**
 * Resolves a post-login redirect target so users are never sent to a dashboard
 * that belongs to a different role. If the requested redirect points at
 * /dashboard/<otherRole>/... it's swapped for the user's own /dashboard/<userType>.
 * Same-role and non-dashboard paths pass through unchanged.
 *
 * Pre-login the original URL is captured by axios.js / authGuard.js with
 * encodeURIComponent, and Next.js auto-decodes router.query, so `redirect` here
 * is already a plain path like "/dashboard/vendor/inquiries-details?id=5".
 *
 * @param {string|undefined|null} redirect - Raw redirect path from router.query.
 * @param {string} userType - User type that just authenticated.
 * @returns {string} A path that's safe to navigate the user to.
 */
export const resolvePostLoginRedirect = (redirect, userType) => {
  const fallback = DEFAULT_DASHBOARD_BY_USER_TYPE[userType] || '/';
  if (!redirect || typeof redirect !== 'string') return fallback;
  // Reject anything that isn't a same-origin absolute path (defends against
  // protocol-relative URLs like "//evil.com" being used as an open redirect).
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return fallback;
  const path = redirect.split('?')[0].split('#')[0];
  const match = path.match(/^\/dashboard\/([^/]+)/);
  if (match) {
    const segment = match[1];
    if (ROLE_DASHBOARD_SEGMENTS.has(segment) && segment !== userType) {
      return fallback;
    }
  }
  return redirect;
};

/**
 * Executes an asynchronous data-fetching function while managing a loading state.
 * @async
 * @function getDataWithLoading
 * @param {Function} fetchingFunc - An asynchronous function that fetches data and returns a Promise.
 * @param {Function} loadingSetter - A function to set the loading state (typically from a React state setter).
 * @returns {Promise<*>} Returns the resolved value from the `fetchingFunc`.
 * @throws {Error} Rethrows any error encountered during the execution of `fetchingFunc`.
 */

export const getDataWithLoading = async (fetchingFunc, loadingSetter) => {
  try {
    loadingSetter(true);
    return await fetchingFunc();
  } catch (error) {
    throw error;
  } finally {
    loadingSetter(false);
  }
};

export const formatToINRShort = (amount) => {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(amount % 10000000 === 0 ? 0 : 1)}Cr`;
  } else if (amount >= 100000) {
    return `${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  } else {
    // Quantise to 2dp so float-drift (e.g. budget - po_total = 50.00000000001)
    // doesn't render raw.
    const quantised = Math.round((Number(amount) || 0) * 100) / 100;
    return quantised.toString();
  }
};

export const textCapitalize = (str) => {
    if (!str) return str;

    return str
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // Capitalize each word
        .join(' ');                               // Join them back with spaces
}

/**
 * Formats RFQ number display based on is_tender flag
 * @param {number|string} rfq_no - The RFQ number
 * @param {boolean|number} is_tender - Whether this is a tender (1/true) or RFQ (0/false)
 * @returns {string} Formatted string like "RFQ #123" or "Tender #123"
 */
export const formatRFQNumber = (rfq_no, is_tender) => {
    if (!rfq_no) return '';
    const isTender = is_tender === 1 || is_tender === true;
    return isTender ? `Tender #${rfq_no}` : `RFQ #${rfq_no}`;
}

/**
 * Returns "Tender" or "RFQ" label based on is_tender flag
 * @param {boolean|number} is_tender - Whether this is a tender (1/true) or RFQ (0/false)
 * @param {boolean} plural - If true, returns "Tenders" or "RFQs"
 * @returns {string} "Tender"/"Tenders" or "RFQ"/"RFQs"
 */
export const getEntityLabel = (is_tender, plural = false) => {
    const isTender = is_tender === 1 || is_tender === true;
    if (plural) {
        return isTender ? 'Tenders' : 'RFQs';
    }
    return isTender ? 'Tender' : 'RFQ';
}

export const getFuturedate = (days = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export const formatPrice = (price) => {
    const formattedPrice = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(price);
    return formattedPrice;
}

const parseIstLikeDateToEpoch = (raw) => {
    if (raw == null || raw === '') return null;
    if (raw instanceof Date) return raw.getTime();
    let s = String(raw).trim();
    if (!s) return null;
    s = s.replace(/([+-]\d{2}:?\d{2}|Z)$/i, '');
    s = s.replace(' ', 'T');
    if (!/T/.test(s)) s += 'T00:00:00';
    else if (/T\d{2}:\d{2}$/.test(s)) s += ':00';
    const d = new Date(`${s}+05:30`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
};

export const checkBidExpired = (bid_end_date) => {
    const endMs = parseIstLikeDateToEpoch(bid_end_date);
    if (endMs == null) return false;
    return Date.now() > endMs;
};

export const extractfileName = (file_url) => {
    return file_url?.split('/').pop();
}

export const handleFileUpload = async (e, token, options = {}) => {
    const { allowAllTypes = false } = options;
    const allowedExtensions = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "png", "jpg", "jpeg"];

    const files = e.target.files;
    const file = files[0];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (allowAllTypes || allowedExtensions.includes(fileExtension)) {
      try {
        const { handleUploadFile } = await import("@/services/rfq");
        const res = await handleUploadFile(file, token);
        const filePath = res.data[0]?.file_path;
  
        if (filePath) {
          return filePath; // Return the uploaded file object
        } else {
          throw new Error("File upload failed. No file path returned.");
        }
      } catch (error) {
        throw new Error("File upload failed: " + error.message);
      }
    } else {
      throw new Error("Unsupported file type. Please upload a PDF, Word, Image, or Excel document.");
    }
  };
  

/**
 * Formats a timestamp into a human-readable format based on how recent it is.
 * Used primarily for displaying message timestamps in chat interfaces.
 * - For today's dates: shows only time (HH:MM AM/PM)
 * - For this year's dates: shows month, day and time
 * - For older dates: shows full date including year
 * @param {string} last_message_timestamp - The timestamp to format
 * @returns {string} Formatted date string
 */
export const formatDate = (last_message_timestamp) => {
    const now = new Date();
    const lastMessageDate = new Date(last_message_timestamp);

    const options = {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    };

    if (lastMessageDate.toDateString() === now.toDateString()) {
        return lastMessageDate.toLocaleString("en-US", options);
    }

    if (lastMessageDate.getFullYear() === now.getFullYear()) {
        return lastMessageDate.toLocaleString("en-US", {
            ...options,
            month: "short",
            day: "numeric",
        });
    }

    return lastMessageDate.toLocaleString("en-US", {
        ...options,
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

/**
 * Converts various datetime string formats to the format required by HTML datetime-local inputs.
 * Specifically handles:
 * - ISO format (2025-04-26T05:00:00.000Z)
 * - SQL format (2025-04-26 05:00:00)
 * - Date-only format (2025-04-26)
 * This function preserves the exact time without timezone adjustments, making it ideal
 * for form inputs that require local datetime values.
 * @param {string} isoString - The date string to format
 * @returns {string} Formatted string in YYYY-MM-DDThh:mm format
 */
export const formatISOToDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    let parts;
    if (isoString.includes('T')) {
        // Handle ISO format (2025-04-26T05:00:00.000Z)
        parts = isoString.split('T')[0].split('-');
        const timeParts = isoString.split('T')[1].split('.')[0].split(':');
        return `${parts[0]}-${parts[1]}-${parts[2]}T${timeParts[0]}:${timeParts[1]}`;
    } else if (isoString.includes(' ')) {
        // Handle SQL format (2025-04-26 05:00:00)
        const [datePart, timePart] = isoString.split(' ');
        parts = datePart.split('-');
        const timeParts = timePart.split(':');
        return `${parts[0]}-${parts[1]}-${parts[2]}T${timeParts[0]}:${timeParts[1]}`;
    } else {
        // If just a date string without time, default to 23:59
        parts = isoString.split('-');
        return `${parts[0]}-${parts[1]}-${parts[2]}T23:59`;
    }
};

/**
 * Formats a date string for display in DD-MM-YYYY format.
 * @param {string|Date} dateStr - The date string or Date object to format
 * @param {object} options - Formatting options
 * @param {boolean} options.includeTime - Include time (HH:mm) in the output
 * @param {boolean} options.includeSeconds - Include seconds (HH:mm:ss)
 * @param {boolean} options.use12Hour - Use 12-hour format with AM/PM
 * @returns {string} Formatted date string in DD-MM-YYYY [HH:mm] format
 */
export const formatDisplayDate = (dateStr, options = {}) => {
    if (!dateStr) return '';
    const { includeTime = false, includeSeconds = false, use12Hour = true } = options;

    let parsedInput = dateStr;
    // Backend sends dates in IST without timezone suffix — parse as local time
    // Just normalize "YYYY-MM-DD HH:MM" format to "YYYY-MM-DDTHH:MM" for valid Date parsing
    if (typeof dateStr === 'string' && /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(dateStr)) {
        parsedInput = dateStr.replace(' ', 'T');
        // Normalize short timezone offsets: +00 → +00:00, -05 → -05:00
        parsedInput = parsedInput.replace(/([+-]\d{2})$/, '$1:00');
    }

    const date = parsedInput instanceof Date ? parsedInput : new Date(parsedInput);
    if (isNaN(date.getTime())) return String(dateStr);

    // Detect date-only strings (e.g. "2024-01-15" without time) — JS parses these as UTC midnight
    // Use UTC components for these to avoid date shifting across timezone boundaries
    const isDateOnlyString = typeof dateStr === 'string' && !dateStr.includes('T') && !/\d{2}:\d{2}/.test(dateStr);

    const day = String(isDateOnlyString ? date.getUTCDate() : date.getDate()).padStart(2, '0');
    const month = String((isDateOnlyString ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
    const year = isDateOnlyString ? date.getUTCFullYear() : date.getFullYear();

    let result = `${day}-${month}-${year}`;

    if (includeTime || includeSeconds) {
        if (use12Hour) {
            let hours = isDateOnlyString ? 0 : date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const mins = String(isDateOnlyString ? 0 : date.getMinutes()).padStart(2, '0');
            result += ` ${String(hours).padStart(2, '0')}:${mins}`;
            if (includeSeconds) {
                result += `:${String(isDateOnlyString ? 0 : date.getSeconds()).padStart(2, '0')}`;
            }
            result += ` ${ampm}`;
        } else {
            const hrs = String(isDateOnlyString ? 0 : date.getHours()).padStart(2, '0');
            const mins = String(isDateOnlyString ? 0 : date.getMinutes()).padStart(2, '0');
            result += ` ${hrs}:${mins}`;
            if (includeSeconds) {
                result += `:${String(isDateOnlyString ? 0 : date.getSeconds()).padStart(2, '0')}`;
            }
        }
    }

    return result;
};

/**
 * Parse a wall-clock-IST datetime string ("2026-04-09 11:11", "2026-04-09T11:11",
 * "2026-04-09T11:11:00", or even "2026-04-09") into an absolute epoch-ms.
 *
 * Use this any time you need to compare an RFQ form date (which the user
 * picks in IST and the backend stores as wall-clock IST) against a
 * universal anchor like Date.now() — appending the +05:30 offset before
 * calling Date() makes the result correct regardless of the server or
 * browser timezone, so the resulting math is always frame-consistent.
 *
 * Returns null when the input can't be parsed.
 */
export const parseIstWallTimeToEpoch = (raw) => {
    return parseIstLikeDateToEpoch(raw);
};

export const formatRemainingDuration = (remainingMs) => {
    const ms = Number(remainingMs);
    if (!Number.isFinite(ms) || ms <= 0) return "0m";

    const totalSeconds = Math.ceil(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${Math.max(minutes, 1)}m`;
};

/**
 * Format a stored datetime value (the kind we get back from the RFQ
 * snapshot or change history — wall-clock IST or with explicit Z) into a
 * compact human-friendly form for the "Previously: …" hint chips on the
 * edit form. Falls back to the raw value if it doesn't parse.
 */
export const formatPrevDateValue = (raw) => {
    if (raw == null || raw === '') return '—';
    // Try the IST wall-clock parser first since most form dates flow
    // through that path. Fall back to the universal parseHistoryDate so
    // values that already carry an explicit timezone still render.
    let ms = parseIstWallTimeToEpoch(raw);
    if (ms == null) {
        const d = parseHistoryDate(raw);
        ms = d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
    }
    if (ms == null) return String(raw);
    return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(new Date(ms));
};

/**
 * WH-69: Edit-history timestamps come from a `TIMESTAMP without time zone`
 * column written by `NOW()` on a UTC database server, but pg-promise serialises
 * them as bare `YYYY-MM-DD HH:mm:ss` strings (no `Z` suffix). `new Date(...)`
 * on those strings would interpret them as the *browser's* local time, which
 * shifts the displayed value by the IST offset (5h30m → "6 hours ago" for an
 * edit that just happened).
 *
 * `parseHistoryDate` always treats history strings as UTC and returns a real
 * `Date` so the rest of the app can format/compare them correctly.
 */
export const parseHistoryDate = (raw) => {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw !== 'string') return new Date(raw);

    let s = raw.trim();
    // Already has explicit timezone info (Z or ±HH:MM) — trust it.
    if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
        return new Date(s);
    }
    // "2026-04-08 13:00:00.123" → "2026-04-08T13:00:00.123Z"
    s = s.replace(' ', 'T');
    if (!/[zZ]$/.test(s)) s += 'Z';
    return new Date(s);
};

/**
 * WH-69: Format an edit-history timestamp in IST regardless of the browser's
 * own time zone. Always parses via `parseHistoryDate` so UTC-stored values
 * line up with the user's wall clock in India.
 */
export const formatHistoryDateIST = (raw, { includeTime = true, includeSeconds = false } = {}) => {
    const date = parseHistoryDate(raw);
    if (!date || isNaN(date.getTime())) return '';
    const opts = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    };
    if (includeTime) {
        opts.hour = '2-digit';
        opts.minute = '2-digit';
        if (includeSeconds) opts.second = '2-digit';
        opts.hour12 = true;
    }
    return new Intl.DateTimeFormat('en-IN', opts).format(date);
};

/**
 * WH-69: "X minutes ago" relative-time string anchored against real wall-clock
 * time. Works for any timestamp returned by `parseHistoryDate`.
 */
export const formatHistoryRelative = (raw) => {
    const date = parseHistoryDate(raw);
    if (!date || isNaN(date.getTime())) return '';
    const ms = Date.now() - date.getTime();
    if (ms < 0) return 'just now'; // clock skew — don't say "in the future"
    const sec = Math.round(ms / 1000);
    if (sec < 45) return 'just now';
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
    const days = Math.round(hr / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatHistoryDateIST(raw, { includeTime: false });
};

const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;

// Note: pricing math (per-line totals, peer normalisation, payment-term
// adjustments) lives on the backend in app/services/pricingEngine.js. The
// frontend renders engine output via the /pricing/preview and
// /rfq/quote-compare/:id endpoints — no client-side recompute.


export const  addCommasToNumber = (number) => {

    if (number <= 0 || !number) {
      return 0
    }

    // Quantise to 2 decimals so float-drift (e.g. 39652.01779…) renders cleanly.
    // Money math is owned by the backend; this is a display-side safety net.
    const quantised = Math.round(Number(number) * 100) / 100;

    // Convert number to string
    let numberString = quantised.toString();

    // Split the number string into parts
    let parts = numberString.split(".");

    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    //parts[0] = parts[0].replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");

    // Join the parts back together with decimal point if applicable
    return parts.join(".");
  };


  /**
 * Safely converts a value to a number rounded to 2 decimal places.
 * - Returns 0 if the value is null, undefined, or not a valid number.
 * - Always returns a number, not a string.
 *
 * @param {any} val - The input value to format.
 * @returns {number} The formatted number with 2 decimal places.
 *
 * @example
 * safeTwoDecimals(0.2986875); // 0.30
 * safeTwoDecimals(null);      // 0
 * safeTwoDecimals("abc");     // 0
 * 
 * @created by mukul on 13-aug-2025
 */
export const safeTwoDecimals = (val) => {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return parseFloat(num.toFixed(2));
};

export const toNumber = (x) => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export const extractParsedNumber = (obj) => {
  if (!obj || !obj.value) return null;
  const { parsedValue, source } = obj.value || {};
  if (typeof parsedValue === "number") return parsedValue;
  if (typeof source === "string") return toNumber(source);
  return null;
};

/**
 * Convert a field (freight/packaging/taxes) into { value, mode }
 * - If numeric: mode is "%" when unit is "%", otherwise "₹"
 * - If non-numeric string: keep text and mode ""
 * - defaultPercent=true forces "%" when numeric and unit missing
 */
export const moneyOrPercent = (input, defaultPercent = false) => {
  if (!input) return { value: "", mode: "" };

  // Text case (common for freight/packaging descriptions)
  if (typeof input.value === "string" && !(input.value && input.value.parsedValue != null)) {
    const text = input.value;
    // Try to extract first number if any
    const match = text.match(/-?\d+(\.\d+)?/);
    if (match) {
      const num = toNumber(match[0]);
      if (num !== null) {
        const unit = input.unit || "";
        return { value: num, mode: unit === "%" ? "%" : "₹" };
      }
    }
    return { value: text, mode: "" };
  } else if (typeof input.value === "number" && !(input.value && input.value.parsedValue != null)) {
    const text = input.value;
    const unit = input.unit || "";

    return { value: text, mode: unit === "%" ? "%" : "₹" };
  }

  // Structured numeric case
  const num = extractParsedNumber(input);
  const unit = (input && input.unit) || "";
  if (num !== null) {
    return { value: num, mode: unit === "%" || defaultPercent ? "%" : "₹" };
  }
  return { value: "", mode: "" };
};

/**
 * Determines RFQ/Tender publication and approval state
 * @param {Object} data - RFQ/Tender data object
 * @returns {Object} State flags and helper values
 */
export const getRFQPublishState = (data) => {
  const isUnpublished = data?.is_published === 0;
  const isPendingApproval = isUnpublished && data?.status === 3;
  const isReadyToPublish = isUnpublished && data?.status === 4;
  const isOpen = data?.status === 1;
  const isClosed = data?.status === 2;
  const isWithdrawn = data?.status === 5;
  const isPrePublishState = isPendingApproval || isReadyToPublish;

  return {
    isUnpublished,
    isPendingApproval,
    isReadyToPublish,
    isOpen,
    isClosed,
    isWithdrawn,
    isPrePublishState,
    // WH-69: Edit window opened up. The RFQ Creator can now edit:
    //   - drafts (status 0)
    //   - pending approval (status 3)
    //   - approved-but-unpublished (status 4)
    //   - open/published (status 1) until bid_end_date passes
    //   - withdrawn (status 5)
    // Permission/owner checks live in canEditRfq() — this flag only encodes
    // the *status-based* slice that the existing UI was already gating on.
    canEdit: !isClosed && !!data && (!isBidEnded(data) || data.has_dead_end_product || data.has_tech_stuck_product || data.has_tech_unstartable_product),
    // Helper for edit URL determination (only used when canEdit === true)
    editUrl: (id) => `/dashboard/buyer/rfq-management-edit?id=${id}`,
    // Helper for queries/reminder visibility
    showVendorActions: !isPrePublishState && !isClosed && !isWithdrawn,
  };
};

/**
 * WH-69: Has the RFQ's bid_end_date already passed?
 * Returns true if there is a bid_end_date and it is in the past.
 */
export const isBidEnded = (rfq) => {
  if (!rfq?.bid_end_date) return false;
  const end = new Date(rfq.bid_end_date);
  if (isNaN(end.getTime())) return false;
  return end <= new Date();
};

/**
 * WH-69: Single-source-of-truth permission helper for the new edit flow.
 *
 * Returns { allowed: boolean, reason?: string }.
 *
 *   allowed === true  → render the Edit button as enabled
 *   allowed === false → render the Edit button as disabled and show `reason`
 *                       in a tooltip
 *
 * Checks (in order — first failure wins so the user sees the most specific
 * blocker first). Must stay in sync with assertEditAllowed in backend
 * rfqUpdateHelpers.js plus the post-edit guards in rfqController.update.
 *
 * @param {Object} rfq          RFQ object with at least { created_by, status,
 *                              bid_end_date, po_completed }
 * @param {Object} currentUser  user profile with at least { id }
 */
export const canEditRfq = (rfq, currentUser) => {
  if (!rfq || !currentUser) {
    return { allowed: false, reason: 'Loading…' };
  }
  // Closed or terminated
  if (rfq.status === 2) {
    return { allowed: false, reason: 'This RFQ is closed.' };
  }
  // All products finalized — nothing left to edit
  if (rfq.po_completed) {
    return {
      allowed: false,
      reason: 'Every product on this RFQ has been finalized and awarded.'
    };
  }
  // Bid window passed — but allow edit if no vendors submitted quotes,
  // so the creator can extend the deadline.
  // Also allow editing when a product is dead-ended (all eligible vendors'
  // POs were rejected and no other vendor available), tech-stuck (all vendors
  // failed tech eval), or tech-unstartable (clauses exist and a vendor quoted,
  // but nobody ever answered, so evaluation cannot even begin and the quote can
  // never surface commercially). All three match a backend assertEditAllowed()
  // bypass — keep this condition and that one in step.
  if (isBidEnded(rfq) && rfq.is_quotes_present
      && !rfq.has_dead_end_product && !rfq.has_tech_stuck_product
      && !rfq.has_tech_unstartable_product) {
    return {
      allowed: false,
      reason: 'The submission deadline has passed; this RFQ can no longer be edited.'
    };
  }
  // Creator-only — backend enforces this too
  if (Number(rfq.created_by) !== Number(currentUser.id)) {
    return {
      allowed: false,
      reason: 'Only the user who created this RFQ can edit it.'
    };
  }
  // Restricted-edit triggers (most-specific reason wins). All three collapse to
  // the same enforcement: only bid_end_date + Refresh Vendors. Mirrors the
  // backend computation of `isRestrictedEdit` in rfqController.update so the FE
  // shouldn't author changes the BE will reject.
  if (rfq.has_dead_end_product) {
    return {
      allowed: true,
      restrictedEdit: true,
      reason: 'Restricted editing: vendors have rejected the PO and no other vendor is finalisable. You can only extend the Quote Submission Deadline and refresh vendors.'
    };
  }
  if (rfq.has_tech_stuck_product) {
    return {
      allowed: true,
      restrictedEdit: true,
      reason: 'Restricted editing: all vendors failed technical evaluation. You can only extend the Quote Submission Deadline and refresh vendors.'
    };
  }
  // Distinct from has_tech_stuck_product above: there, evaluation ran and
  // everyone failed. Here it never started — nobody answered the clauses, so
  // there is nobody to score and no quote can clear the commercial gate.
  // Extending the deadline is the only way out, because the vendor cannot answer
  // a technical clause after the window closes.
  if (rfq.has_tech_unstartable_product) {
    return {
      allowed: true,
      restrictedEdit: true,
      reason: 'Restricted editing: a product needs technical evaluation but no vendor answered its clauses, so evaluation cannot start. Extend the Quote Submission Deadline to let vendors respond — you can only change the deadline and refresh vendors.'
    };
  }
  if (rfq.has_received_quotes) {
    return {
      allowed: true,
      restrictedEdit: true,
      reason: 'Restricted editing: vendors have started submitting quotes. To stay fair to participants you can only extend the Quote Submission Deadline and refresh vendors.'
    };
  }
  return { allowed: true };
};

/**
 * Compact Indian-currency formatter — "₹0" / "₹1.2K" / "₹3.45L" / "₹1.2Cr".
 *
 * Lifted verbatim (behaviour-for-behaviour) out of
 * dashboard-components/NegotiationSavings.js so the dashboard tile, the
 * Negotiation Command Center and anything else that needs the ₹/K/L/Cr scale
 * read from one implementation instead of a fourth copy-paste.
 *
 * NOTE: this is unsigned by design (the dashboard tile clamps negatives to
 * zero before calling it). Callers that need signed output — e.g. a
 * negotiation that made the price go UP — should format the magnitude and
 * apply their own sign, which is what formatSignedCurrencyShort does.
 *
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export const formatCurrencyShort = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '₹0';
  const trimZeros = (s) => s.replace(/\.?0+$/, '');
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${trimZeros((n / 10000000).toFixed(2))}Cr`;
  if (abs >= 100000) return `₹${trimZeros((n / 100000).toFixed(2))}L`;
  if (abs >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

/**
 * Signed variant used by diagnostic surfaces that must NOT clamp a price
 * regression to zero: renders "+₹1.2K" for a saving and "−₹236" (U+2212 minus)
 * for a price increase. Zero renders as a plain "₹0".
 *
 * @param {number|string|null|undefined} value  signed amount (positive = saved)
 * @returns {string}
 */
export const formatSignedCurrencyShort = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '₹0';
  const body = formatCurrencyShort(Math.abs(n));
  return n > 0 ? `+${body}` : `−${body}`;
};
