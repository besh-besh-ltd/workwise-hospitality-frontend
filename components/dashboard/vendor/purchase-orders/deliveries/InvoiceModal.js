import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { Send } from "lucide-react";
import { handleRaiseInvoice } from "@/services/po";
import { handleUploadFile } from "@/services/rfq";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError";
import vd from "./vendorDeliveries.module.scss";
import { todayIso } from "./deliveryFormat";

const AMOUNT = /^\d{1,14}(\.\d{1,2})?$/;
const NUMBER_MAX = 64;
// Server field (handleRaiseInvoice / invoiceService) → form field.
const SERVER_FIELDS = {
  invoice_number: "number",
  invoice_date: "date",
  invoice_amount: "amount",
  dispatch_id: "dispatchId",
  invoice_url: "file",
};

const prettySize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const emptyFile = { name: "", size: null, url: "", uploading: false, problem: "" };

/**
 * A vendor invoice for one delivery (contract: POST /po/raiseInvoice with
 * invoice_number, invoice_date, invoice_amount and an optional dispatch_id).
 * A PO takes as many invoices as it has deliveries. The file goes to our S3
 * first (handleUploadFile), then the invoice is raised with its URL.
 *
 * Props: show, onClose, poId, poNumber, dispatches (the vendor's dispatch
 * notes; withdrawn ones are not offered), defaultDispatchId, onDone().
 */
export default function InvoiceModal({ show, onClose, poId, poNumber, dispatches = [], defaultDispatchId = null, onDone }) {
  const [file, setFile] = useState(emptyFile);
  const [form, setForm] = useState({ number: "", date: "", amount: "", dispatchId: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setFile(emptyFile);
    setForm({ number: "", date: "", amount: "", dispatchId: defaultDispatchId != null ? String(defaultDispatchId) : "" });
    setErrors({});
    setServerError("");
    setSaving(false);
  }, [show, defaultDispatchId]);

  const choices = dispatches.filter((d) => d.status !== "cancelled");

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const pickFile = async (e) => {
    const chosen = e.target.files?.[0] || null;
    if (!chosen) return;
    if (errors.file) setErrors((x) => ({ ...x, file: undefined }));
    setFile({ name: chosen.name, size: chosen.size, url: "", uploading: true, problem: "" });
    try {
      const res = await handleUploadFile(chosen);
      const url = res?.data?.[0]?.file_path;
      if (!url) throw new Error("The upload did not return a file link.");
      setFile((f) => ({ ...f, url, uploading: false }));
    } catch (err) {
      const problem = getApiErrorMessage(err, "Couldn't upload the file. Please try again.");
      setFile((f) => ({ ...f, url: "", uploading: false, problem }));
    }
  };

  const submit = async () => {
    if (saving) return;
    const errs = {};
    if (file.uploading) errs.file = "Wait for the upload to finish";
    else if (!file.url) errs.file = "Attach the invoice file";

    const number = form.number.trim().replace(/\s+/g, " ");
    if (!number) errs.number = "Invoice number is required";
    else if (number.length > NUMBER_MAX) errs.number = `Up to ${NUMBER_MAX} characters`;

    if (!form.date) errs.date = "Invoice date is required";
    else if (form.date > todayIso()) errs.date = "The invoice date cannot be in the future";

    const amount = form.amount.replace(/[,\s₹]/g, "");
    if (!amount) errs.amount = "Invoice amount is required";
    else if (!AMOUNT.test(amount) || !(Number(amount) > 0)) errs.amount = "More than zero, with at most 2 decimals";

    setServerError("");
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      await handleRaiseInvoice(poId, file.url, {
        invoiceNumber: number,
        invoiceDate: form.date,
        invoiceAmount: amount,
        dispatchId: form.dispatchId ? Number(form.dispatchId) : null,
      });
      toast.success(`Invoice ${number} raised${poNumber ? ` for PO #${poNumber}` : ""}.`);
      setSaving(false);
      onDone?.();
    } catch (err) {
      const message = getApiErrorMessage(err, "Couldn't raise the invoice. Please try again.");
      const field = SERVER_FIELDS[getApiErrorData(err)?.details?.field];
      if (field) setErrors({ [field]: message });
      else setServerError(message);
      setSaving(false);
    }
  };

  const invalid = (key) => (errors[key] ? "true" : undefined);
  const describedBy = (key) => (errors[key] ? `inv-${key}-err` : undefined);
  const fieldError = (key) =>
    errors[key] ? (
      <span id={`inv-${key}-err`} className={vd.err}>
        {errors[key]}
      </span>
    ) : null;

  return (
    <Modal
      show={show}
      onHide={saving ? undefined : onClose}
      centered
      backdrop="static"
      className={`${vd.dialog} ${vd.dialogNarrow}`}
      aria-labelledby="raise-invoice-title"
    >
      <Modal.Header closeButton={!saving}>
        <Modal.Title id="raise-invoice-title">Raise invoice</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className={vd.intro}>
          One invoice per delivery. It is shared with the buyer and can&apos;t be replaced once raised, so check the
          file and figures first.
        </p>
        {serverError && (
          <p className={vd.alert} role="alert">
            {serverError}
          </p>
        )}
        <div className={vd.grid2}>
          <div className={`${vd.field} ${vd.fieldFull}`}>
            <label className={vd.label} htmlFor="inv-file">Invoice file</label>
            <input
              id="inv-file"
              type="file"
              className={vd.input}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={pickFile}
              disabled={saving || file.uploading}
              aria-invalid={invalid("file")}
              aria-describedby={describedBy("file")}
            />
            {file.name && (
              <span className={vd.fileMeta}>
                {file.uploading ? "Uploading " : ""}
                {file.name}
                {file.size ? ` · ${prettySize(file.size)}` : ""}
                {file.uploading ? "…" : ""}
              </span>
            )}
            {file.problem && <span className={vd.err}>{file.problem}</span>}
            {fieldError("file")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="inv-number">Invoice number</label>
            <input
              id="inv-number"
              className={vd.input}
              maxLength={NUMBER_MAX}
              autoComplete="off"
              value={form.number}
              onChange={setField("number")}
              disabled={saving}
              aria-invalid={invalid("number")}
              aria-describedby={describedBy("number")}
            />
            {fieldError("number")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="inv-date">Invoice date</label>
            <input
              id="inv-date"
              type="date"
              className={vd.input}
              max={todayIso()}
              value={form.date}
              onChange={setField("date")}
              disabled={saving}
              aria-invalid={invalid("date")}
              aria-describedby={describedBy("date")}
            />
            {fieldError("date")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="inv-amount">Invoice amount (₹)</label>
            <input
              id="inv-amount"
              className={`${vd.input} ${vd.amountInput}`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={form.amount}
              onChange={setField("amount")}
              disabled={saving}
              aria-invalid={invalid("amount")}
              aria-describedby={describedBy("amount")}
            />
            {fieldError("amount")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="inv-dispatch">Delivery</label>
            <select
              id="inv-dispatch"
              className={vd.select}
              value={form.dispatchId}
              onChange={setField("dispatchId")}
              disabled={saving}
              aria-invalid={invalid("dispatchId")}
              aria-describedby={describedBy("dispatchId")}
            >
              <option value="">Not tied to one dispatch</option>
              {choices.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {[d.dispatchNumber, d.hotelName, d.phaseNo != null ? `Phase ${d.phaseNo}` : null, d.challanNo ? `challan ${d.challanNo}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
            {fieldError("dispatchId")}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className={`${vd.mBtn} ${vd.mBtnSecondary}`} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={`${vd.mBtn} ${vd.mBtnPrimary}`} onClick={submit} disabled={saving || file.uploading}>
          <Send size={14} />
          {saving ? "Raising…" : "Raise invoice"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
