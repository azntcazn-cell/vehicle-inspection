"use client";

import { useState } from "react";

const VIN_PATTERN = /[A-HJ-NPR-Z0-9]{17}/;

// Extract a plausible VIN from decoded barcode text. Door-jamb Code 39
// labels often prefix the VIN with an "I" (import character), and 2D codes
// sometimes wrap the VIN in additional data.
function extractVin(raw: string): string | null {
  const text = raw.trim().toUpperCase();
  const candidates = [text];
  if (text.length === 18 && text.startsWith("I")) candidates.push(text.slice(1));
  for (const candidate of candidates) {
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(candidate)) return candidate;
  }
  const embedded = text.match(VIN_PATTERN);
  return embedded ? embedded[0] : null;
}

// Downscale huge camera stills before decoding — dense VIN barcodes stay
// resolvable at this size when photographed close up, and it keeps wasm
// memory/decode time reasonable on phones.
const MAX_DIMENSION = 2400;

async function fileToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return ctx.getImageData(0, 0, width, height);
}

async function decodeVinFromPhoto(file: File): Promise<string | null> {
  const { prepareZXingModule, readBarcodes } = await import("zxing-wasm/reader");
  // Serve the wasm binary ourselves instead of zxing-wasm's default CDN.
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path,
    },
  });

  const imageData = await fileToImageData(file);
  const results = await readBarcodes(imageData, {
    formats: ["Code39", "Code128", "DataMatrix", "PDF417", "QRCode", "Aztec", "ITF"],
    tryHarder: true,
    maxNumberOfSymbols: 4,
  });

  for (const result of results) {
    const vin = extractVin(result.text);
    if (vin) return vin;
  }
  return null;
}

export function VinScanner({ onScan }: { onScan: (vin: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const vin = await decodeVinFromPhoto(file);
      if (vin) {
        onScan(vin);
      } else {
        setError(
          "No VIN barcode found in the photo. Get closer to the barcode on the driver-door sticker, make sure it's sharp and well-lit, then try again."
        );
      }
    } catch (err) {
      console.error("VIN scan failed:", err);
      setError("Couldn't read that photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-900">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            handlePhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        📷 Scan VIN
      </label>

      {(busy || error) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5">
            {busy ? (
              <p className="text-base text-neutral-700">Reading barcode…</p>
            ) : (
              <>
                <p className="text-base text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="mt-4 w-full rounded-md bg-neutral-900 px-4 py-2.5 text-base font-medium text-white"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
