// Simulate a real phone photo of a VIN sticker (barcode small-in-frame,
// slight blur, JPEG artifacts) and compare the OLD decode path (browser
// downscale to 2400px, which smooths the bars) against the NEW native-res
// path. Proves the pre-downscale was breaking real-world decoding.
import bwipjs from "bwip-js";
import sharp from "sharp";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { readFileSync } from "fs";
import path from "path";

const VIN = "1HGCM82633A004352";
prepareZXingModule({
  overrides: { wasmBinary: readFileSync(path.resolve("public/zxing_reader.wasm")).buffer },
});

const OPTIONS = {
  formats: ["Code39", "Code128", "DataMatrix", "PDF417", "QRCode", "Aztec", "ITF"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
  downscaleFactor: 2,
  maxNumberOfSymbols: 0,
};

function extractVin(raw) {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(t)) return t;
  if (t.length === 18 && t.startsWith("I") && /^[A-HJ-NPR-Z0-9]{17}$/.test(t.slice(1))) return t.slice(1);
  const m = t.match(/[A-HJ-NPR-Z0-9]{17}/);
  return m ? m[0] : null;
}

async function decode(buf) {
  const results = await readBarcodes(new Uint8Array(buf).buffer, OPTIONS);
  for (const r of results) {
    const vin = extractVin(r.text);
    if (vin) return vin;
  }
  return null;
}

// 1. Code 39 VIN barcode (as printed on a door sticker)
const barcodePng = await bwipjs.toBuffer({
  bcid: "code39", text: VIN, scale: 2, height: 10, includetext: false, backgroundcolor: "FFFFFF",
});
const bc = await sharp(barcodePng).metadata();

// 2. Composite it small-in-frame into a large 3024x4032 "photo" (~12MP),
//    add gaussian blur (soft focus) and heavy JPEG compression.
const photoW = 3024, photoH = 4032;
const bcTargetW = Math.round(photoW * 0.38); // barcode ~38% of frame width
const bcResized = await sharp(barcodePng)
  .resize({ width: bcTargetW })
  .toBuffer();
const bcMeta = await sharp(bcResized).metadata();

const photoJpeg = await sharp({
  create: { width: photoW, height: photoH, channels: 3, background: "#cfc9c0" },
})
  .composite([{ input: bcResized, left: Math.round((photoW - bcMeta.width) / 2), top: Math.round((photoH - bcMeta.height) / 2) }])
  .blur(2.2)
  .jpeg({ quality: 40 })
  .toBuffer();

console.log(`Simulated photo: ${photoW}x${photoH}, barcode ~${bcTargetW}px wide, blurred + JPEG q55`);

// NEW path: native resolution (what the fixed code sends zxing)
const newVin = await decode(photoJpeg);
console.log(`NEW (native res)      => ${newVin} ${newVin === VIN ? "PASS" : "FAIL"}`);

// OLD path: browser-style downscale to 2400px with smooth resampling
const downscaled = await sharp(photoJpeg)
  .resize({ width: 2400, kernel: "cubic" })
  .png()
  .toBuffer();
const oldVin = await decode(downscaled);
console.log(`OLD (downscaled 2400) => ${oldVin} ${oldVin === VIN ? "PASS" : "FAIL"}`);

process.exit(newVin === VIN ? 0 : 1);
