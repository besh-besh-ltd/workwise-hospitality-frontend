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


