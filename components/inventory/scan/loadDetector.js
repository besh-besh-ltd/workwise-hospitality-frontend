import { locateZXingFile } from "./zxingAsset";

// The camera decoder (barcode-detector ponyfill + zxing wasm), loaded once per
// page. It lives apart from CameraScanner so a scan screen can warm the
// decoder up without statically importing the camera component (which must
// only ever arrive through LazyCameraScanner).
//
// Resolves to the ponyfill module once the wasm is downloaded and compiled,
// so a resolved promise means BarcodeDetector is ready to decode. A failed
// download rejects, and the next call starts over: the cached promise is
// dropped and zxing's own module cache purged, otherwise every retry would
// get the same rejected wasm promise back.
let pending = null;

export const loadDetector = () => {
  if (!pending) {
    pending = import("barcode-detector/ponyfill").then(async (mod) => {
      try {
        await mod.prepareZXingModule({
          overrides: { locateFile: (path, prefix) => locateZXingFile(path, prefix, mod.ZXING_WASM_VERSION) },
          fireImmediately: true,
        });
      } catch (err) {
        mod.purgeZXingModule();
        throw err;
      }
      return mod;
    });
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
};

export default loadDetector;
