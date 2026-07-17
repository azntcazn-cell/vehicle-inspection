// Generate VIN barcodes in the formats used on real door-jamb stickers,
// then decode them with zxing-wasm the same way the app does.
import bwipjs from "bwip-js";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { readFileSync } from "fs";
import path from "path";

const VIN = "1HGCM82633A004352";

const wasmPath = path.resolve("public/zxing_reader.wasm");
prepareZXingModule({
  overrides: {
    wasmBinary: readFileSync(wasmPath).buffer,
  },
});

const cases = [
  { opts: { bcid: "code39", text: VIN, height: 12 }, name: "Code 39 (plain)" },
  { opts: { bcid: "code39", text: "I" + VIN, height: 12 }, name: "Code 39 (leading I import char)" },
  { opts: { bcid: "datamatrix", text: VIN }, name: "Data Matrix" },
  { opts: { bcid: "pdf417", text: VIN }, name: "PDF417" },
  { opts: { bcid: "qrcode", text: VIN }, name: "QR Code" },
];

function extractVin(raw) {
  const text = raw.trim().toUpperCase();
  const candidates = [text];
  if (text.length === 18 && text.startsWith("I")) candidates.push(text.slice(1));
  for (const c of candidates) {
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(c)) return c;
  }
  const m = text.match(/[A-HJ-NPR-Z0-9]{17}/);
  return m ? m[0] : null;
}

let failures = 0;
for (const c of cases) {
  const png = await bwipjs.toBuffer({
    ...c.opts,
    scale: 3,
    includetext: false,
    paddingwidth: 12,
    paddingheight: 12,
    backgroundcolor: "FFFFFF",
  });
  const blob = new Blob([png], { type: "image/png" });
  const results = await readBarcodes(blob, {
    formats: ["Code39", "Code128", "DataMatrix", "PDF417", "QRCode", "Aztec", "ITF"],
    tryHarder: true,
    maxNumberOfSymbols: 4,
  });
  const decoded = results[0]?.text ?? null;
  const vin = decoded ? extractVin(decoded) : null;
  const ok = vin === VIN;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}: decoded=${JSON.stringify(decoded)} vin=${vin}`);
}
process.exit(failures ? 1 : 0);
