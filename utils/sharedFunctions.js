import { useState, useEffect } from 'react';
import axiosInstance from "@/lib/axios";
import { handleUploadFile } from "@/services/rfq";

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
    const END_DATE = new Date(bid_end_date);
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
        // If just a date string without time
        parts = isoString.split('-');
        return `${parts[0]}-${parts[1]}-${parts[2]}T00:00`;
    }
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

 if (normalizeFilter) {
    let normalizedTotal = 0;
    let totalPercentDefined = 0; 

    item?.payment_terms?.forEach(term => {
      const percentage = parseFloat(term.value) || 0; // x, y, z %
      const days = parseInt(term.days ?? 0) || 0;

      totalPercentDefined += percentage;

      // Deduction = 1% per 30 days
      const rawFactor = 1 - (days / 30) * 0.01;
      const factor = Math.max(0, Math.min(1, rawFactor)); // Clamp to [0,1]
      
      // Add this tranche
      normalizedTotal += (percentage / 100) * TotalPrice * factor;
    });

    // NEW — Add leftover percentage without discount
    if (totalPercentDefined < 100) {
      const leftoverPercent = 100 - totalPercentDefined;
      normalizedTotal += (leftoverPercent / 100) * TotalPrice;
    }

    TotalPrice = normalizedTotal || TotalPrice;
  }


  return Math.round(TotalPrice);
}


/**
 * @created by mukul on 13-aug-2025
 * @description Normalizes freight, packaging, and tax for nested quote details.
 * Converts absolute values to percentages and fills missing values using
 * average (freight/package) or median (tax). Caps all three to 2 decimals.
 * @used in category wise and overall quotation chart
 * @test_cases written in workwise-portal/tests/utils/sharedFunctions.test.js
 */
export const handleNormalize = (data) => {
  // --- helpers ---
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  const getQty = (d) => {
    const fromRfq = d?.rfq_details?.find((x) => x.title === "Quantity")?.value;
    const q = toNum(fromRfq ?? d?.quantity ?? 0);
    return q > 0 ? q : 0;
  };

  // --- pre-normalize absolute -> percentage (values + labels) ---
  const preNormalized = (data || []).map((item) => ({
    ...item,
    quotations: (item.quotations || []).map((quote) => ({
      ...quote,
      quote_details: (quote.quote_details || []).map((detail) => {
        const unit = toNum(detail.unit_price);
        const qty = getQty(detail);
        const base = unit * qty;
        const d = { ...detail };

        if (d.freight_mode === "absolute") {
          const pct = base ? (toNum(d.freight_price) / base) * 100 : 0;
          d.freight_price = round2(pct);
          d.freight_mode = "percentage";
        } else if (d.freight_mode === "percentage") {
          d.freight_price = round2(toNum(d.freight_price));
        }

        if (d.package_mode === "absolute") {
          const pct = base ? (toNum(d.package_price) / base) * 100 : 0;
          d.package_price = round2(pct);
          d.package_mode = "percentage";
        } else if (d.package_mode === "percentage") {
          d.package_price = round2(toNum(d.package_price));
        }

        if (d.tax_mode === "absolute") {
          const pct = base ? (toNum(d.tax) / base) * 100 : 0;
          d.tax = round2(pct);
          d.tax_mode = "percentage";
        } else if (d.tax_mode === "percentage") {
          d.tax = round2(toNum(d.tax));
        }

        return d;
      }),
    })),
  }));
  // --- END pre-normalize ---

  // pools must use PERCENT data -> use preNormalized
  const allFreightPrices = [];
  const allPackagePrices = [];
  const allTaxRates = [];

  preNormalized.forEach((item) => {
    item.quotations.forEach((quote) => {
      quote.quote_details?.forEach((detail) => {
        const freight = toNum(detail.freight_price);
        if (!isNaN(freight)) allFreightPrices.push(freight);

        const pack = toNum(detail.package_price);
        if (!isNaN(pack)) allPackagePrices.push(pack);

        const tax = toNum(detail.tax);
        if (!isNaN(tax)) allTaxRates.push(tax);
      });
    });
  });

  const averageFreight = allFreightPrices.length
    ? round2(allFreightPrices.reduce((s, v) => s + v, 0) / allFreightPrices.length)
    : 0;

  const averagePackage = allPackagePrices.length
    ? round2(allPackagePrices.reduce((s, v) => s + v, 0) / allPackagePrices.length)
    : 0;

  const sortedTaxRates = [...allTaxRates].sort((a, b) => a - b);
  const medianTax = (() => {
    const len = sortedTaxRates.length;
    if (len === 0) return 0;
    const mid = Math.floor(len / 2);
    const m =
      len % 2 === 0
        ? (sortedTaxRates[mid - 1] + sortedTaxRates[mid]) / 2
        : sortedTaxRates[mid];
    return round2(m);
  })();

  // final mapping must also use preNormalized so labels are "%"
  const normalized = preNormalized.map((item) => {
    const vendorTermsById = new Map(
      (item.all_vendors || []).map((v) => [v.id, v.payment_terms || []])
    );

    const updatedQuotations = item.quotations.map((quote) => {
      const paymentTerms = vendorTermsById.get(quote.created_by) || [];

      const updatedDetails =
        quote.quote_details?.map((detail) => {
          const currentFreight = toNum(detail.freight_price);
          const currentPackage = toNum(detail.package_price);
          const currentTax = toNum(detail.tax);

          const finalFreight =
            isNaN(currentFreight) || currentFreight === 0
              ? averageFreight
              : round2(currentFreight);

          const finalPackage =
            isNaN(currentPackage) || currentPackage === 0
              ? averagePackage
              : round2(currentPackage);

          const finalTax =
            isNaN(currentTax) || currentTax === 0 ? medianTax : round2(currentTax);

          return {
            ...detail,
            freight_price: finalFreight,
            package_price: finalPackage,
            tax: finalTax,
            payment_terms: paymentTerms,
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
  // --- helpers ---
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  const getQty = (q) => {
    const fromRfq = q?.rfq_details?.find?.((x) => x.title === "Quantity")?.value;
    const qtty =
      toNum(fromRfq) ||
      toNum(q?.quantity) ||
      toNum(q?.quote_details?.[0]?.quantity);
    return qtty > 0 ? qtty : 0;
  };
  const getUnit = (q) => toNum(q?.unit_price ?? q?.quote_details?.[0]?.unit_price);

  // --- pre-normalize absolute -> percentage (values + labels) ---
  const preNormalized = (data || []).map((item) => ({
    ...item,
    quotations: (item.quotations || []).map((q) => {
      const unit = getUnit(q);
      const qty = getQty(q);
      const base = unit * qty; // base for % conversion

      const r = { ...q };

      if (r.package_mode === "absolute") {
        const pct = base ? (toNum(r.package_price) / base) * 100 : 0;
        r.package_price = round2(pct);
        r.package_mode = "percentage";
      } else if (r.package_mode === "percentage") {
        r.package_price = round2(toNum(r.package_price));
      }

      if (r.freight_mode === "absolute") {
        const pct = base ? (toNum(r.freight_price) / base) * 100 : 0;
        r.freight_price = round2(pct);
        r.freight_mode = "percentage";
      } else if (r.freight_mode === "percentage") {
        r.freight_price = round2(toNum(r.freight_price));
      }

      if (r.tax_mode === "absolute") {
        const pct = base ? (toNum(r.tax) / base) * 100 : 0;
        r.tax = round2(pct);
        r.tax_mode = "percentage";
      } else if (r.tax_mode === "percentage") {
        r.tax = round2(toNum(r.tax));
      }

      return r;
    }),
  }));
  // --- end pre-normalize ---

  // Collect all values (including 0) FROM preNormalized
  const allFreightPrices = [];
  const allPackagePrices = [];
  const allTaxRates = [];

  preNormalized.forEach((item) => {
    item.quotations.forEach((quote) => {
      const freight = toNum(quote.freight_price);
      if (!isNaN(freight)) allFreightPrices.push(freight);

      const pack = toNum(quote.package_price);
      if (!isNaN(pack)) allPackagePrices.push(pack);

      const tax = toNum(quote.tax);
      if (!isNaN(tax)) allTaxRates.push(tax);
    });
  });

  const average = (arr) =>
    arr.length ? round2(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const median = (arr) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const m =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    return round2(m);
  };

  const averageFreight = average(allFreightPrices);
  const averagePackage = average(allPackagePrices);
  const medianTax = median(allTaxRates);

  // Normalize (use preNormalized so modes are already '%')
  const normalizedData = preNormalized.map((item) => {
    const updatedQuotations = item.quotations.map((quote) => {
      const freight = toNum(quote.freight_price);
      const pack = toNum(quote.package_price);
      const tax = toNum(quote.tax);

      return {
        ...quote,
        freight_price:
          isNaN(freight) || freight === 0 ? averageFreight : round2(freight),
        package_price:
          isNaN(pack) || pack === 0 ? averagePackage : round2(pack),
        tax: isNaN(tax) || tax === 0 ? medianTax : round2(tax),
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