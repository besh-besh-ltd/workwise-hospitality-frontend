// Where the camera decoder's wasm lives. It is served from our own origin
// (public/vendor/zxing/<zxing-wasm version>/zxing_reader.wasm), never from the
// package's default jsDelivr URL. The version is in the path because Next
// serves public/ files with max-age=0; a new version gets a new URL.
//
// Upgrading barcode-detector / zxing-wasm: copy the new
// node_modules/zxing-wasm/dist/reader/zxing_reader.wasm to
// public/vendor/zxing/<new version>/. __tests__/zxingAsset.test.js fails until
// the copy matches the installed build.

export const ZXING_WASM_DIR = "/vendor/zxing";

export const locateZXingFile = (path, prefix, version) =>
  path.endsWith(".wasm") ? `${ZXING_WASM_DIR}/${version}/${path}` : prefix + path;

export default locateZXingFile;
