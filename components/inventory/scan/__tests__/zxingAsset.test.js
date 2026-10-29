import fs from "fs";
import path from "path";
import crypto from "crypto";
import { locateZXingFile } from "../zxingAsset";

// The camera decoder's wasm is served from our own origin, not jsDelivr. The
// file in public/ must be the exact build the installed polyfill was compiled
// against: a mismatched Emscripten glue/wasm pair fails at instantiate time,
// on a phone, with no useful message. Bumping zxing-wasm without copying the
// new wasm fails here instead.
const root = path.resolve(__dirname, "../../../..");
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

describe("self-hosted zxing wasm", () => {
  const zxingPkg = JSON.parse(fs.readFileSync(path.join(root, "node_modules/zxing-wasm/package.json"), "utf8"));
  const detectorPkg = JSON.parse(fs.readFileSync(path.join(root, "node_modules/barcode-detector/package.json"), "utf8"));

  it("public/vendor/zxing/<version>/zxing_reader.wasm is the installed build", () => {
    expect(detectorPkg.dependencies["zxing-wasm"]).toBe(zxingPkg.version);
    const served = path.join(root, "public/vendor/zxing", zxingPkg.version, "zxing_reader.wasm");
    expect(fs.existsSync(served)).toBe(true);
    expect(sha(served)).toBe(sha(path.join(root, "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm")));
  });

  it("the loader asks for the versioned local path and leaves other files alone", () => {
    expect(locateZXingFile("zxing_reader.wasm", "https://cdn.example/", "3.1.6")).toBe("/vendor/zxing/3.1.6/zxing_reader.wasm");
    expect(locateZXingFile("other.data", "/x/", "3.1.6")).toBe("/x/other.data");
  });
});
