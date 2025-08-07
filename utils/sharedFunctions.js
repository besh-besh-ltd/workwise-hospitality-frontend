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
 * 
 * Last changes by mukul on 07-aug-2025, to add normalization based on payment terms
 */
export const calculateTotal = (item, quantity, normalizeFilter) => {
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

   // ✅ If normalization is ON and payment_terms are present
  if (normalizeFilter && Array.isArray(item.payment_terms)) {
    let normalizedTotal = 0;

    item.payment_terms.forEach(term => {
      const percentage = term.value ?? 0;
      const days = parseFloat(term.days ?? 0);
      const delayDays = isNaN(days) ? 0 : days;

      // 1% deduction for every 30 days
      const discountFactor = 1 - (delayDays / 30) * 0.01;

      normalizedTotal += (percentage / 100) * TotalPrice * discountFactor;
    });

    return Math.round(normalizedTotal);
  }

  return Math.round(TotalPrice);
}

// normalize for overall and category cost comparision
export const handleNormalize = (products) => {
  const allFreightPrices = [];
  const allPackagePrices = [];
  const allTaxRates = [];

  products.forEach(product => {
    product.quotations.forEach(quote => {
      quote.quote_details?.forEach(detail => {
        const freight = parseFloat(detail.freight_price);
        if (!isNaN(freight)) allFreightPrices.push(freight);

        const pack = parseFloat(detail.package_price);
        if (!isNaN(pack)) allPackagePrices.push(pack);

        const tax = parseFloat(detail.tax);
        if (!isNaN(tax)) allTaxRates.push(tax);
      });
    });
  });

  const averageFreight = allFreightPrices.length
    ? allFreightPrices.reduce((sum, val) => sum + val, 0) / allFreightPrices.length
    : 0;

  const averagePackage = allPackagePrices.length
    ? allPackagePrices.reduce((sum, val) => sum + val, 0) / allPackagePrices.length
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

  const normalized = products.map(product => {
    const updatedQuotations = product.quotations.map(quote => {
      const updatedDetails = quote.quote_details?.map(detail => {
        const currentFreight = parseFloat(detail.freight_price);
        const currentPackage = parseFloat(detail.package_price);
        const currentTax = parseFloat(detail.tax);

        return {
          ...detail,
          freight_price:
            isNaN(currentFreight) || currentFreight === 0 ? averageFreight : currentFreight,
          package_price:
            isNaN(currentPackage) || currentPackage === 0 ? averagePackage : currentPackage,
          tax:
            isNaN(currentTax) || currentTax === 0 ? medianTax : currentTax,
            payment_terms: [{ value:10, label: "advance" }, { value: 20, label: "credit", days:30 },{ value: 70, label: "credit", days:60 }],
        };
      }) || [];

      return {
        ...quote,
        quote_details: updatedDetails,
      };
    });

    return {
      ...product,
      quotations: updatedQuotations,
    };
  });

  console.table("Normalized data:", normalized);

  return normalized;
};


// 
export const normalizeFlatQuotationData = (data) => {
  const allFreightPrices = [];
  const allPackagePrices = [];
  const allTaxRates = [];

  // Step 1: Collect all values (including 0)
  data.forEach(item => {
    item.quotations.forEach(quote => {
      const freight = parseFloat(quote.freight_price);
      if (!isNaN(freight)) allFreightPrices.push(freight);

      const pack = parseFloat(quote.package_price);
      if (!isNaN(pack)) allPackagePrices.push(pack);

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

  // Step 2: Normalize
  const normalizedData = data.map(item => {
    const updatedQuotations = item.quotations.map(quote => {
      const freight = parseFloat(quote.freight_price);
      const pack = parseFloat(quote.package_price);
      const tax = parseFloat(quote.tax);

      return {
        ...quote,
        freight_price: isNaN(freight) || freight === 0 ? averageFreight : freight,
        package_price: isNaN(pack) || pack === 0 ? averagePackage : pack,
        tax: isNaN(tax) || tax === 0 ? medianTax : tax,
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