import { useState, useEffect } from 'react';
import axiosInstance from "@/lib/axios";
import { handleUploadFile, persistMagicSearchJob } from "@/services/rfq";

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
    return amount.toString();
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

export const checkBidExpired = (bid_end_date) => {
    if (!bid_end_date) {
        return false;
    }
    const CURRENT_DATE = new Date();
    let dateStr = bid_end_date;
    if (typeof dateStr === 'string') {
        dateStr = dateStr.replace(/\s+/, 'T');
        // Normalize short timezone offsets: +00 → +00:00, -05 → -05:00
        dateStr = dateStr.replace(/([+-]\d{2})$/, '$1:00');
    }
    const END_DATE = new Date(dateStr);
    return CURRENT_DATE > END_DATE;
};

export const extractfileName = (file_url) => {
    return file_url?.split('/').pop();
}

export const handleFileUpload = async (e, token) => {
    const allowedExtensions = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "png", "jpg", "jpeg"];
  
    const files = e.target.files;
    const file = files[0];
    const fileExtension = file.name.split(".").pop().toLowerCase();
  
    if (allowedExtensions.includes(fileExtension)) {
      try {
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

/**
 * Calculation_steps:
 * base = 100 * 2 = 200
 * freight = 200 * 10% = 20
 * packaging = 200 * 5% = 10
 * subtotal = 200 + 20 + 10 = 230
 * tax = 230 * 18% = 41.4
 * total = 230 + 41.4 = 271.4
 *
 * Apply payment_terms:
 * - 10% Advance → no discount: 10% of 271.4 = 27.14
 * - 20% @30 days → 1% discount: 20% * 271.4 * 0.99 = 53.166
 * - 70% @60 days → 2% discount: 70% * 271.4 * 0.98 = 186.556
 *
 * Final normalized total = 27.14 + 53.166 + 186.556 = 266.862 → Math.round = 267
 * Note: If payment terms do not sum to 100%, the leftover percentage (100% - defined %)  is added back to the normalized total with no discount applied.
 * Last changes by mukul on 07-aug-2025, to add normalization based on payment terms
 */
export const calculateTotal = (item, quantity, normalizeFilter) => {

// return 0
  let total_qty = parseFloat(quantity) || 0;
  let unit_price = item.unit_price || 0;
  
  // Handle null values by defaulting to 0
  let freight_price = item.freight_price !== null ? parseFloat(item.freight_price) : 0;
  let package_price = item.package_price !== null ? parseFloat(item.package_price) : 0;
  let tax = item.tax !== null ? parseFloat(item.tax) : 0;

  let total_without_fpt = unit_price * total_qty;
  let FP = (item.freight_mode ?? "percentage") == 'percentage' ? (total_without_fpt * freight_price) / 100 : freight_price;
  let PP = (item.package_mode ?? "percentage") == 'percentage' ? (total_without_fpt * package_price) / 100 : package_price;

  let total_with_fpt = total_without_fpt + FP + PP;
  let T = (item.tax_mode ?? "percentage") == 'percentage' ? (total_with_fpt * tax) / 100 : tax;

  let TotalPrice = total_with_fpt + T;

const DELIVERY_DAYS = parseInt(item.delivery_period || 0);

if (normalizeFilter) {
  let normalizedTotal = 0;
  let totalPercentDefined = 0;

  item?.payment_terms?.forEach(term => {
    const percentage = parseFloat(term.value) || 0;
    const type = (term.type || "").toLowerCase();
    const days = parseInt(term.days || 0);
    const pctAmount = (percentage / 100) * TotalPrice;

    let factor = 1;

    if (type === "advance") {
      // Advance logic: factor = 1 + (delivery_days / 30) * 1/100
      factor = 1 + (DELIVERY_DAYS / 30) * (1 / 100);
    } else if (type === "credit") {
      // Credit logic: factor = 1 - (days / 30) * 1/100
      factor = 1 - (days / 30) * (1 / 100);
    } else {
      // 'other' or anything unknown is left over (skip here)
      return;
    }

    // Clamp factor between 0 and something reasonable (not mandatory but safe)
    factor = Math.max(0, factor);

    normalizedTotal += pctAmount * factor;
    totalPercentDefined += percentage;
  });

  // Handle leftover (includes "other" type)
  if (totalPercentDefined < 100) {
    const leftoverPercent = 100 - totalPercentDefined;
    normalizedTotal += (leftoverPercent / 100) * TotalPrice;
  }

  TotalPrice = normalizedTotal;
}

  return Math.round(TotalPrice);
}


/**
 * @created by mukul on 13-aug-2025
 * @description Normalizes freight, packaging, and tax for nested quote details. Converts absolute values to percentages and fills missing values using average (freight/package) or median (tax).
 * @used in category wise and overall quotation chart,
 * @test_cases written in workwise-portal/tests/utils/sharedFunctions.test.js
 */
export const handleNormalize = (data) => {

  // --- pre-normalize absolute -> percentage (values + labels) ---
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const getQty = (d) => {
    const fromRfq = d?.rfq_details?.find(x => x.title === 'Quantity')?.value;
    const q = toNum(fromRfq ?? d?.quantity ?? 0);
    return q > 0 ? q : 0;
  };
  const preNormalized = (data || []).map(item => ({
    ...item,
    quotations: (item.quotations || []).map(quote => ({
      ...quote,
      quote_details: (quote.quote_details || []).map(detail => {
        const unit = toNum(detail.unit_price);
        const qty  = getQty(detail);
        const base = unit * qty;
        const d = { ...detail };

        if (d.freight_mode === 'absolute') {
          d.freight_price = base ? (toNum(d.freight_price) / base) * 100 : 0;
          d.freight_mode = 'percentage';
        }
        if (d.package_mode === 'absolute') {
          d.package_price = base ? (toNum(d.package_price) / base) * 100 : 0;
          d.package_mode = 'percentage';
        }
        if (d.tax_mode === 'absolute') {
          d.tax = base ? (toNum(d.tax) / base) * 100 : 0;
          d.tax_mode = 'percentage';
        }
        return d;
      })
    }))
  }));
  // --- END pre-normalize ---

  // pools must use PERCENT data -> use preNormalized
  const allFreightPrices = [];
  const allPackagePrices = [];
  const allTaxRates = [];

  preNormalized.forEach(item => {                 // <-- changed
    item.quotations.forEach(quote => {
      quote.quote_details?.forEach(detail => {
      const freight = parseFloat(detail.freight_price);
      if (!isNaN(freight) && freight > 0) allFreightPrices.push(freight);

      const pack = parseFloat(detail.package_price);
      if (!isNaN(pack) && pack > 0) allPackagePrices.push(pack);

        const tax = parseFloat(detail.tax);
        if (!isNaN(tax)) allTaxRates.push(tax);
      });
    });
  });

  const averageFreight = allFreightPrices.length
    ? allFreightPrices.reduce((s, v) => s + v, 0) / allFreightPrices.length
    : 0;

  const averagePackage = allPackagePrices.length
    ? allPackagePrices.reduce((s, v) => s + v, 0) / allPackagePrices.length
    : 0;

  const sortedTaxRates = allTaxRates.sort((a, b) => a - b);
  const medianTax = (() => {
    const len = sortedTaxRates.length;
    if (len === 0) return 0;
    const mid = Math.floor(len / 2);
    return len % 2 === 0
      ? (sortedTaxRates[mid - 1] + sortedTaxRates[mid]) / 2
      : sortedTaxRates[mid];
  })();

  // final mapping must also use preNormalized so labels are "%"
  const normalized = preNormalized.map(item => {  // <-- changed

    const vendorTermsById = new Map(
      (item.all_vendors || []).map(v => [v.id, v.payment_terms || []])
    );

    const updatedQuotations = item.quotations.map(quote => {

      const paymentTerms = vendorTermsById.get(quote.created_by) || [];

    const updatedDetails = quote.quote_details?.map(detail => {
      const currentFreight = safeTwoDecimals(detail.freight_price);
      const currentPackage = safeTwoDecimals(detail.package_price);
      const currentTax = safeTwoDecimals(detail.tax);
    
      return {
        ...detail,
        freight_price:
          currentFreight === 0 ? safeTwoDecimals(averageFreight) : currentFreight,
        package_price:
          currentPackage === 0 ? safeTwoDecimals(averagePackage) : currentPackage,
        tax:
          currentTax === 0 ? safeTwoDecimals(medianTax) : currentTax,
        payment_terms: paymentTerms
      };
    }) || [];


      return { ...quote, quote_details: updatedDetails };
    });

    return { ...item, quotations: updatedQuotations };
  });

  return normalized;
};



/**
 * @created by mukul on 13-aug-2025
 * @description Normalizes freight, packaging, and tax for nested quote details. Converts absolute values to percentages and fills missing values using average (freight/package) or median (tax).
 * @used in individual quotation chart, and input is flat quotation data
 * @test_cases written in workwise-portal/tests/utils/sharedFunctions.test.js
 */
export const normalizeFlatQuotationData = (data) => {

  // --- pre-normalize absolute -> percentage (values + labels) ---
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const getQty = (q) => {
    const fromRfq = q?.rfq_details?.find?.(x => x.title === 'Quantity')?.value;
    const qtty =
      toNum(fromRfq) ||
      toNum(q?.quantity) ||
      toNum(q?.quote_details?.[0]?.quantity);
    return qtty > 0 ? qtty : 0;
  };
  const getUnit = (q) =>
    toNum(q?.unit_price ?? q?.quote_details?.[0]?.unit_price);

  const preNormalized = (data || []).map(item => ({
    ...item,
    quotations: (item.quotations || []).map(q => {
      const unit = getUnit(q);
      const qty  = getQty(q);
      const base = unit * qty; // base for % conversion

      const r = { ...q };

      if (r.package_mode === 'absolute') {
        r.package_price = base ? (toNum(r.package_price) / base) * 100 : 0;
        r.package_mode = 'percentage';
      }
      if (r.freight_mode === 'absolute') {
        r.freight_price = base ? (toNum(r.freight_price) / base) * 100 : 0;
        r.freight_mode = 'percentage';
      }
      if (r.tax_mode === 'absolute') {
        r.tax = base ? (toNum(r.tax) / base) * 100 : 0;
        r.tax_mode = 'percentage';
      }
      return r;
    })
  }));
  // --- end pre-normalize ---

  // return data 
  const allFreightPrices = [];
  const allPackagePrices = [];
  const allTaxRates = [];

  // Step 1: Collect all values (including 0) FROM preNormalized
  preNormalized.forEach(item => {
    item.quotations.forEach(quote => {
      const freight = parseFloat(quote.freight_price);
     if (!isNaN(freight) && freight > 0) allFreightPrices.push(freight);

     const pack = parseFloat(quote.package_price);
     if (!isNaN(pack) && pack > 0) allPackagePrices.push(pack);

      const tax = parseFloat(quote.tax);
      if (!isNaN(tax)) allTaxRates.push(tax);
    });
  });

  const average = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const median = arr => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return arr.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  const averageFreight = average(allFreightPrices);
  const averagePackage = average(allPackagePrices);
  const medianTax = median(allTaxRates);

  // Step 2: Normalize (use preNormalized so modes are already '%')
  const normalizedData = preNormalized.map(item => {
    const updatedQuotations = item.quotations.map(quote => {
      const freight = safeTwoDecimals(quote.freight_price);
      const pack = safeTwoDecimals(quote.package_price);
      const tax = safeTwoDecimals(quote.tax);
  
      return {
        ...quote,
        freight_price: freight === 0 ? safeTwoDecimals(averageFreight) : freight,
        package_price: pack === 0 ? safeTwoDecimals(averagePackage) : pack,
        tax: tax === 0 ? safeTwoDecimals(medianTax) : tax,
      };
    });
  
    return {
      ...item,
      quotations: updatedQuotations,
    };
  });

  return normalizedData;
};


export const  addCommasToNumber = (number) => {

    if (number <= 0 || !number) {
      return 0
    }

    // Convert number to string
    let numberString = number.toString();

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
    canEdit: !isClosed && !!data && !isBidEnded(data),
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
  // Bid window passed
  if (isBidEnded(rfq)) {
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
  return { allowed: true };
};