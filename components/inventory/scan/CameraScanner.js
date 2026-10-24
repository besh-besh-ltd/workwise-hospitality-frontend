import React, { useEffect, useRef, useState } from "react";
import { Flashlight, FlashlightOff } from "lucide-react";
import { locateZXingFile } from "./zxingAsset";
import styles from "./Scan.module.scss";

// Live camera decoder. Load it with next/dynamic {ssr:false} (LazyCameraScanner)
// so neither this file nor the decoder is in the first page load.
//
// Decoding uses the barcode-detector ponyfill (zxing-wasm) on every browser,
// even where a native BarcodeDetector exists: one decoder means one behaviour,
// and GS1 reads come back the same everywhere (plain text, GS separators).
// The wasm is self-hosted (zxingAsset.js).
//
// Props: onDetected(rawValue, format) for every code in every decoded frame
// (the caller's useScanner drops repeats). The stream is released on unmount;
// keep this mounted across a screen's steps, as iOS home-screen apps ask for
// camera permission again on every new stream.

const FORMATS = [
  "qr_code", "data_matrix", "ean_13", "ean_8", "upc_a", "upc_e",
  "code_128", "code_39", "itf", "databar", "databar_expanded",
];
const FRAME_INTERVAL_MS = 150;

// The decoder module, loaded once per page. Exported so a scan screen can
// warm it up on mount and shave the wasm download off the first camera start.
let detectorModule = null;
export const loadDetector = () => {
  if (!detectorModule) {
    detectorModule = import("barcode-detector/ponyfill")
      .then((mod) => {
        // Must run before the first BarcodeDetector is built: the constructor
        // starts loading the wasm straight away.
        mod.prepareZXingModule({
          overrides: { locateFile: (path, prefix) => locateZXingFile(path, prefix, mod.ZXING_WASM_VERSION) },
        });
        return mod;
      })
      .catch((err) => {
        detectorModule = null;
        throw err;
      });
  }
  return detectorModule;
};

const MESSAGES = {
  starting: "Starting camera…",
  scanning: "Point the camera at a barcode or QR label.",
  denied: "Camera access is blocked. Allow it in the browser's site settings, or scan or type the code.",
  insecure: "The camera needs a secure (https) connection. Scan or type the code instead.",
  unavailable: "No camera found on this device. Scan or type the code instead.",
  error: "The camera could not start. Scan or type the code instead.",
};

const stopStream = (stream) => {
  stream?.getTracks?.().forEach((track) => {
    try {
      track.stop();
    } catch {
      // already stopped
    }
  });
};

const CameraScanner = ({ onDetected }) => {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState("starting");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let timer = null;
    const video = videoRef.current;

    const run = async () => {
      if (!window.isSecureContext) {
        setStatus("insecure");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        // Fetch the decoder while the permission prompt is up.
        const detectorReady = loadDetector();
        detectorReady.catch(() => {});
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        const track = stream.getVideoTracks()[0] || null;
        trackRef.current = track;
        const caps = typeof track?.getCapabilities === "function" ? track.getCapabilities() : {};
        setTorchAvailable(Boolean(caps?.torch));

        video.srcObject = stream;
        await video.play().catch(() => {});

        const { BarcodeDetector } = await detectorReady;
        if (cancelled) return;
        const detector = new BarcodeDetector({ formats: FORMATS });
        setStatus("scanning");

        const frame = async () => {
          if (cancelled) return;
          if (video.readyState >= 2 && !document.hidden) {
            try {
              const codes = await detector.detect(video);
              if (cancelled) return;
              for (const c of codes) if (c?.rawValue) onDetectedRef.current?.(c.rawValue, c.format);
            } catch {
              // A frame that fails to decode is not an error; try the next.
            }
          }
          timer = setTimeout(frame, FRAME_INTERVAL_MS);
        };
        frame();
      } catch (err) {
        if (cancelled) return;
        const name = err?.name;
        if (name === "NotAllowedError" || name === "SecurityError") setStatus("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setStatus("unavailable");
        else setStatus("error");
      }
    };
    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopStream(stream);
      trackRef.current = null;
      if (video) video.srcObject = null;
    };
  }, []);

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

  return (
    <div className={styles.camera}>
      <div className={`${styles.viewport} ${live ? "" : styles.viewportIdle}`}>
        <video ref={videoRef} className={styles.video} muted playsInline autoPlay aria-label="Camera preview" />
        {live && <div className={styles.reticle} aria-hidden="true" />}
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
      <p className={`${styles.cameraNote} ${live ? "" : styles.cameraNoteProblem}`}>{MESSAGES[status]}</p>
    </div>
  );
};

export default CameraScanner;
