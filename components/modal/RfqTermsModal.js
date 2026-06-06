import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FiX, FiDownload } from "react-icons/fi";
import { toast } from "react-toastify";
import { downloadRfqTermsPdf } from "@/services/rfq";

const WysiwygEditor = dynamic(
  () => import("@/components/wysiwyg-editor/wysiwygeditor"),
  { ssr: false }
);

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 24,
};

const dialogStyle = {
  background: "#ffffff",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.22)",
  width: "100%",
  maxWidth: 560,
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 18px",
  borderBottom: "1px solid #e5e7eb",
};

const titleStyle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: "#1a2730",
};

const headerActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const downloadBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  border: "1px solid #2E5BA8",
  background: "#2E5BA8",
  color: "#ffffff",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  lineHeight: 1.2,
};

const closeBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: "none",
  background: "transparent",
  borderRadius: 6,
  color: "#54616e",
  cursor: "pointer",
};

const bodyStyle = {
  padding: "16px 18px",
  fontSize: 13,
  lineHeight: 1.6,
  color: "#1a2730",
  overflowY: "auto",
  flex: "1 1 auto",
};

const RfqTermsModal = ({ open, onClose, rfq }) => {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open || !rfq?.id) return null;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadRfqTermsPdf(rfq.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeRfqNo = String(rfq.rfq_no || rfq.id).replace(/[^A-Za-z0-9_-]/g, "_");
      a.download = `terms-and-conditions-${safeRfqNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Unable to download Terms & Conditions. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="presentation">
      <div
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rfq-terms-modal-title"
      >
        <div style={headerStyle}>
          <h3 id="rfq-terms-modal-title" style={titleStyle}>
            Terms &amp; Conditions
          </h3>
          <div style={headerActionsStyle}>
            <button
              type="button"
              style={{ ...downloadBtnStyle, opacity: downloading ? 0.7 : 1, cursor: downloading ? "wait" : "pointer" }}
              onClick={handleDownload}
              disabled={downloading}
              aria-label="Download Terms & Conditions as PDF"
            >
              <FiDownload size={13} />
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
            <button
              type="button"
              style={closeBtnStyle}
              aria-label="Close"
              onClick={onClose}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        <div style={bodyStyle}>
          <WysiwygEditor
            value={rfq.comment || ""}
            readOnly
            showToolbar={false}
            minHeight="auto"
          />
        </div>
      </div>
    </div>
  );
};

export default RfqTermsModal;
