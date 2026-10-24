import React, { useEffect, useId, useState } from "react";
import { Camera, CameraOff, Loader2, ScanBarcode, Search, Volume2, VolumeX } from "lucide-react";
import LazyCameraScanner from "./LazyCameraScanner";
import scanFeedback from "./scanFeedback";
import { useScanner } from "./useScanner";
import styles from "./Scan.module.scss";

// The one scan box every inventory screen uses: camera, keyboard-wedge scanner
// and typed entry all go through useScanner and come out as the same result.
//
//   <ScanInput context="po:12" onResolved={(result, meta) => …} onUnknown={(code, result, meta) => …} />
//
// onResolved gets every recognised read (kind item / po / grn / dispatch);
// onUnknown gets the code worth linking (the GTIN for a GS1 read) when the
// server does not know it, typically to open LinkUnknownCodeSheet.
// Mount one ScanInput per screen (it listens for wedge scans page-wide).
// `disabled` stops taking reads but leaves an open camera running (paused),
// so a busy step does not cost the user a new camera permission prompt.

const unknownCodeOf = (result, parsed) =>
  result?.gs1?.gtin || parsed?.gs1?.gtin || result?.code || parsed?.code || "";

const summarise = (result) => {
  if (!result) return null;
  switch (result.kind) {
    case "item": {
      const it = result.item || {};
      const pack = Number(it.packFactor) > 1 ? `${Number(it.packFactor)} ${it.stockUom || ""} per scan`.trim() : null;
      return { tone: "ok", text: it.displayName || "Item", detail: pack, code: result.code };
    }
    case "po":
      return { tone: "ok", text: "Purchase order", detail: null, code: `#${result.poId}` };
    case "grn":
      return { tone: "ok", text: "Goods receipt", detail: null, code: `#${result.grnId}` };
    case "dispatch":
      return { tone: "ok", text: "Dispatch", detail: null, code: `#${result.dispatchId}` };
    default:
      return { tone: "warn", text: "Not recognised", detail: null, code: unknownCodeOf(result) };
  }
};

const ScanInput = ({
  context,
  onResolved,
  onUnknown,
  placeholder = "Scan or type a code",
  autoFocus = false,
  disabled = false,
  className = "",
}) => {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [muted, setMutedState] = useState(() => scanFeedback.isMuted());

  const scanner = useScanner({
    context,
    enabled: !disabled,
    onScan: (result, meta) => {
      if (!result || result.kind === "unknown") onUnknown?.(unknownCodeOf(result, meta.parsed), result, meta);
      else onResolved?.(result, meta);
    },
  });

  useEffect(() => scanFeedback.installUnlock(), []);

  const submitTyped = () => {
    if (disabled) return;
    if (scanner.submit(value, "manual")) setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;
    // The wedge listener (window, capture phase) runs first. If it took this
    // burst as a scan it prevented the Enter / Tab that ended it; the burst's
    // characters also landed in the box, so clear them instead of submitting
    // them twice. A Tab nobody claimed is a person moving to the next field.
    const claimedByWedge = e.nativeEvent?.defaultPrevented === true;
    if (claimedByWedge) {
      setValue("");
      return;
    }
    if (e.key === "Tab") return;
    e.preventDefault();
    submitTyped();
  };

  const toggleCamera = () => {
    if (scanner.active) scanner.stop();
    else scanner.start();
  };

  const toggleMute = () => {
    const next = !muted;
    scanFeedback.setMuted(next);
    setMutedState(next);
    if (!next) scanFeedback.unlock();
  };

  const status = scanner.error
    ? { tone: "bad", text: scanner.error, detail: null, code: null }
    : scanner.pending
      ? { tone: "busy", text: "Looking up…", detail: null, code: null }
      : summarise(scanner.lastResult);

  return (
    <div className={`${styles.scan} ${className}`}>
      <div className={styles.bar}>
        <div className={styles.field}>
          <ScanBarcode size={16} className={styles.fieldIcon} aria-hidden="true" />
          <input
            id={inputId}
            className={styles.input}
            type="text"
            data-scan-input="true"
            aria-label="Scan or type a code"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={submitTyped}
          disabled={disabled || !value.trim()}
        >
          <Search size={15} aria-hidden="true" />
          <span>Look up</span>
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn} ${scanner.active ? styles.btnOn : ""}`}
          onClick={toggleCamera}
          disabled={disabled && !scanner.active}
          aria-label={scanner.active ? "Stop camera" : "Scan with camera"}
          title={scanner.active ? "Stop camera" : "Scan with camera"}
        >
          {scanner.active ? <CameraOff size={17} aria-hidden="true" /> : <Camera size={17} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          onClick={toggleMute}
          aria-label="Mute scan sounds"
          aria-pressed={muted}
          title={muted ? "Scan sounds off" : "Scan sounds on"}
        >
          {muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
        </button>
      </div>

      {scanner.active && <LazyCameraScanner onDetected={scanner.onCameraCode} paused={disabled} />}

      <div role="status" aria-live="polite" className={`${styles.status} ${status ? styles[`status_${status.tone}`] : ""}`}>
        {status && (
          <>
            {status.tone === "busy" ? (
              <Loader2 size={14} className={styles.spin} aria-hidden="true" />
            ) : (
              <span className={styles.dot} aria-hidden="true" />
            )}
            <span className={styles.statusText}>{status.text}</span>
            {status.detail && <span className={styles.statusDetail}>{status.detail}</span>}
            {status.code && <span className={styles.mono}>{status.code}</span>}
          </>
        )}
      </div>
    </div>
  );
};

export default ScanInput;
