import axiosInstance from "@/lib/axios";
import { handleUploadFile } from "@/services/rfq";

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
    return file_url.split('/').pop();
}

export const handleFileUpload = async (e,token) => {
    const allowedExtensions = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "png", "jpg", "jpeg"];

    const files = e.target.files;
    const file = files[0];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
        try {
            const res = await handleUploadFile(file,token);
            const filePath = res.data[0]?.file_path;

            if (filePath) {
                return filePath;
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


