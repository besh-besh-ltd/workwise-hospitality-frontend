import React, { useEffect, useRef, useState } from "react";
import { Flashlight, FlashlightOff, RotateCcw } from "lucide-react";
import { loadDetector } from "./loadDetector";
import styles from "./Scan.module.scss";

// Live camera decoder. Load it with next/dynamic {ssr:false} (LazyCameraScanner)
// so neither this file nor the decoder is in the first page load. Nothing may
// import this file statically; the decoder loader is in loadDetector.js.
//
// Decoding uses the barcode-detector ponyfill (zxing-wasm) on every browser,
// even where a native BarcodeDetector exists: one decoder means one behaviour,
// and GS1 reads come back the same everywhere (plain text, GS separators).
// The wasm is self-hosted (zxingAsset.js).
//
// Props:
//   onDetected(rawValue, format)  every code in every decoded frame (the
//                                 caller's useScanner drops repeats)
//   paused                        stop decoding but keep the camera open
//
// Keep this mounted across a screen's steps and use `paused` while a step is
// busy: iOS home-screen apps ask for camera permission again on every new
// stream. The stream is released on unmount and whenever scanning gives up
// (decoder failed to load, frames keep failing), so a dead scanner never
// leaves the camera light on.

const FORMATS = [
  "qr_code", "data_matrix", "ean_13", "ean_8", "upc_a", "upc_e",
  "code_128", "code_39", "itf", "databar", "databar_expanded",
];
const FRAME_INTERVAL_MS = 150;
// One frame failing to decode is noise; this many in a row means the decoder
// is broken (lost wasm memory, a crashed module) and the viewfinder would
// otherwise sit there reading nothing.
export const MAX_FAILED_FRAMES = 20;

const MESSAGES = {
  starting: "Starting camera…",
  scanning: "Point the camera at a barcode or QR label.",
  paused: "Scanning paused. The camera picks up again when this step is ready.",
  denied: "Camera access is blocked. Allow it in the browser's site settings, or scan or type the code.",
  insecure: "The camera needs a secure (https) connection. Scan or type the code instead.",
  unavailable: "No camera found on this device. Scan or type the code instead.",
  error: "The camera could not start. Scan or type the code instead.",
  decoder: "The scanner could not load. Check the connection and try again, or scan or type the code.",
  stalled: "The camera stopped reading codes. Try again, or scan or type the code.",
};
const RETRYABLE = new Set(["denied", "error", "decoder", "stalled"]);

const stopStream = (stream) => {
  stream?.getTracks?.().forEach((track) => {
    try {
      track.stop();
    } catch {
      // already stopped
    }
  });
};

const CameraScanner = ({ onDetected, paused = false }) => {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const pausedRef = useRef(paused);
  const [status, setStatus] = useState("starting");
  const [attempt, setAttempt] = useState(0);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    pausedRef.current = paused;
  });

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let timer = null;
    const video = videoRef.current;

    const release = () => {
      clearTimeout(timer);
      timer = null;
      stopStream(stream);
      stream = null;
      trackRef.current = null;
      if (video) video.srcObject = null;
    };
    const giveUp = (next) => {
      if (cancelled) return;
      release();
      setTorchAvailable(false);
      setTorchOn(false);
      setStatus(next);
    };

    const run = async () => {
      if (!window.isSecureContext) {
        setStatus("insecure");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      // Fetch the decoder while the permission prompt is up.
      const detectorReady = loadDetector();
      detectorReady.catch(() => {});

      try {
        const granted = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          // Unmounted while the permission prompt was open.
          stopStream(granted);
          return;
        }
        stream = granted;
      } catch (err) {
        if (cancelled) return;
        const name = err?.name;
        if (name === "NotAllowedError" || name === "SecurityError") setStatus("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setStatus("unavailable");
        else setStatus("error");
        return;
      }

      try {
        const track = stream.getVideoTracks()[0] || null;
        trackRef.current = track;
        const caps = typeof track?.getCapabilities === "function" ? track.getCapabilities() : {};
        setTorchAvailable(Boolean(caps?.torch));
        video.srcObject = stream;
        await video.play().catch(() => {});
      } catch {
        giveUp("error");
        return;
      }
      if (cancelled) return;

      let detector;
      try {
        const { BarcodeDetector } = await detectorReady;
        if (cancelled) return;
        detector = new BarcodeDetector({ formats: FORMATS });
      } catch {
        giveUp("decoder");
        return;
      }
      setStatus("scanning");

      let failedInARow = 0;
      const frame = async () => {
        timer = null;
        if (cancelled) return;
        if (!pausedRef.current && video.readyState >= 2 && !document.hidden) {
          try {
            const codes = await detector.detect(video);
            if (cancelled) return;
            failedInARow = 0;
            if (!pausedRef.current) {
              for (const c of codes) if (c?.rawValue) onDetectedRef.current?.(c.rawValue, c.format);
            }
          } catch {
            if (cancelled) return;
            failedInARow += 1;
            if (failedInARow >= MAX_FAILED_FRAMES) {
              giveUp("stalled");
              return;
            }
          }
        }
        timer = setTimeout(frame, FRAME_INTERVAL_MS);
      };
      frame();
    };
    run();

    return () => {
      cancelled = true;
      release();
    };
  }, [attempt]);

  const retry = () => {
    setStatus("starting");
    setAttempt((n) => n + 1);
  };

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  const live = status === "scanning" || status === "starting";
  const note = status === "scanning" && paused ? MESSAGES.paused : MESSAGES[status];

  return (
    <div className={styles.camera}>
      <div className={`${styles.viewport} ${live ? "" : styles.viewportIdle}`}>
        <video ref={videoRef} className={styles.video} muted playsInline autoPlay aria-label="Camera preview" />
        {live && <div className={`${styles.reticle} ${paused ? styles.reticlePaused : ""}`} aria-hidden="true" />}
        {torchAvailable && status === "scanning" && (
          <button
            type="button"
            className={styles.torch}
            onClick={toggleTorch}
            aria-label="Torch"
            aria-pressed={torchOn}
          >
            {torchOn ? <FlashlightOff size={18} aria-hidden="true" /> : <Flashlight size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {live ? (
        <p className={styles.cameraNote}>{note}</p>
      ) : (
        <div className={styles.cameraProblem}>
          <p className={`${styles.cameraNote} ${styles.cameraNoteProblem}`} role="alert">{note}</p>
          {RETRYABLE.has(status) && (
            <button type="button" className={styles.btn} onClick={retry}>
              <RotateCcw size={15} aria-hidden="true" />
              <span>Try again</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CameraScanner;
