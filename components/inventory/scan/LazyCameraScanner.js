import dynamic from "next/dynamic";

// The camera decoder, loaded on demand and never on the server (it touches
// navigator.mediaDevices and pulls in the zxing wasm loader).
const LazyCameraScanner = dynamic(() => import("./CameraScanner"), { ssr: false });

export default LazyCameraScanner;
