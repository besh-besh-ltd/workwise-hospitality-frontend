import React, { useId, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { fmtDay } from "./receiveUtils";
import { AttachKindSelect, AttachmentList } from "./receiveShared";
import styles from "./receive.module.scss";

// "Delivery documents": the vendor's paperwork for this delivery (challan,
// invoice, e-way bill, vehicle), the dispatch note it arrived against, and
// photos / PDFs of them. A phone can shoot the challan straight from here.
//
// Props: { header, onChange(patch), dispatches[], onPickDispatch(id), attachments[],
//          pendingFiles[], onUpload(file, kind), onDelete(attachment), onRemovePending(index),
//          uploading, canDelete }

const Field = ({ label, children, full = false, htmlFor }) => (
  <div className={full ? styles.formFull : undefined}>
    <label className={styles.label} htmlFor={htmlFor}>{label}</label>
    {children}
  </div>
);

const DeliveryDocuments = ({
  header, onChange, dispatches = [], onPickDispatch, attachments = [], pendingFiles = [], onUpload, onDelete,
  onRemovePending, uploading = false, canDelete = true,
}) => {
  const uid = useId();
  const id = (k) => `${uid}-${k}`;
  const [kind, setKind] = useState("CHALLAN");

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onUpload(file, kind);
  };
  const text = (key, label, props = {}) => (
    <Field label={label} htmlFor={id(key)}>
      <input
        id={id(key)}
        className={styles.input}
        value={header[key] || ""}
        onChange={(e) => onChange({ [key]: e.target.value })}
        {...props}
      />
    </Field>
  );

  return (
    <div>
      <div className={styles.formGrid}>
        {dispatches.length > 0 && (
          <Field label="Against dispatch" htmlFor={id("dispatch")} full>
            <select
              id={id("dispatch")}
              className={styles.select}
              value={header.dispatchId || ""}
              onChange={(e) => onPickDispatch(e.target.value)}
            >
              <option value="">Not against a dispatch note</option>
              {dispatches.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {[d.dispatchNumber, d.challanNo && `challan ${d.challanNo}`, d.expectedDeliveryDate && `due ${fmtDay(d.expectedDeliveryDate)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
          </Field>
        )}
        {text("receivedAt", "Received on", { type: "date" })}
        {text("vendorChallanNo", "Challan no.", { maxLength: 64, autoComplete: "off" })}
        {text("vendorChallanDate", "Challan date", { type: "date" })}
        {text("vendorInvoiceNo", "Invoice no.", { maxLength: 64, autoComplete: "off" })}
        {text("vendorInvoiceDate", "Invoice date", { type: "date" })}
        {text("ewayBillNo", "E-way bill no.", { maxLength: 64, autoComplete: "off" })}
        {text("vehicleNo", "Vehicle no.", { maxLength: 32, autoComplete: "off", autoCapitalize: "characters" })}
        <Field label="Remarks" htmlFor={id("remarks")} full>
          <textarea
            id={id("remarks")}
            className={styles.textarea}
            value={header.remarks || ""}
            maxLength={2000}
            onChange={(e) => onChange({ remarks: e.target.value })}
          />
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <span className={styles.label}>Attachments</span>
        <AttachmentList
          attachments={attachments}
          pendingFiles={pendingFiles}
          onDelete={canDelete ? onDelete : undefined}
          onRemovePending={onRemovePending}
          empty={<p className={styles.fieldHint}>Photograph the signed challan and the invoice so accounts can match them.</p>}
        />
        <div className={styles.attActions}>
          <AttachKindSelect value={kind} onChange={setKind} />
          <label className={`${styles.btn} ${styles.btnSecondary} ${styles.fileBtn}`}>
            {uploading ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}
            <span>Take photo</span>
            <input type="file" accept="image/*,application/pdf" capture="environment" onChange={pick} disabled={uploading} />
          </label>
          <label className={`${styles.btn} ${styles.btnSecondary} ${styles.fileBtn}`}>
            <Upload size={14} aria-hidden="true" />
            <span>Upload file</span>
            <input type="file" accept="image/*,application/pdf" onChange={pick} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDocuments;
