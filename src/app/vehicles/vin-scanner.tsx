"use client";

import { useState } from "react";
import type { ReaderOptions } from "zxing-wasm/reader";

const VIN_PATTERN = /[A-HJ-NPR-Z0-9]{17}/;

// Extract a plausible VIN from decoded barcode text. Door-jamb Code 39
// labels often prefix the VIN with an "I" (import character), and 2D codes
// sometimes wrap the VIN in additional data.
function extractVin(raw: string): string | null {
  const text = raw.trim().toUpperCase().replace(/\s+/g, "");
  const candidates = [text];
  if (text.length === 18 && text.startsWith("I")) candidates.push(text.slice(1));
  for (const candidate of candidates) {
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(candidate)) return candidate;
  }
  const embedded = text.match(VIN_PATTERN);
  return embedded ? embedded[0] : null;
}

// Cap only enormous images to avoid running the wasm decoder out of memory;
// virtually all phone photos are under this, so they reach zxing at native
// resolution. Browser downscaling smooths the sharp bar edges a dense VIN
// barcode needs, so we let zxing do its own (barcode-aware) multi-scale
// scanning instead of pre-shrinking the image ourselves.
const MAX_DIMENSION = 4096;

// Produce full-resolution pixels plus a center crop. The crop isolates the
// barcode from surrounding sticker text/graphics (whose proximity can
// violate the barcode's required quiet zone) and effectively zooms in.
async function imageDataVariants(file: File): Promise<ImageData[]> {
  // createImageBitmap also normalizes iOS HEIC captures to raw pixels.
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const full = document.createElement("canvas");
  full.width = width;
  full.height = height;
  const fctx = full.getContext("2d", { willReadFrequently: true })!;
  fctx.drawImage(bitmap, 0, 0, width, height);

  // Center crop: middle 70% of each dimension, drawn at native scale.
  const cropW = Math.round(bitmap.width * 0.7);
  const cropH = Math.round(bitmap.height * 0.7);
  const crop = document.createElement("canvas");
  crop.width = cropW;
  crop.height = cropH;
  const cctx = crop.getContext("2d", { willReadFrequently: true })!;
  cctx.drawImage(
    bitmap,
    Math.round(bitmap.width * 0.15),
    Math.round(bitmap.height * 0.15),
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  bitmap.close();
  return [
    fctx.getImageData(0, 0, width, height),
    cctx.getImageData(0, 0, cropW, cropH),
  ];
}

const READER_OPTIONS: ReaderOptions = {
  formats: ["Code39", "Code128", "DataMatrix", "PDF417", "QRCode", "Aztec", "ITF"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
  downscaleFactor: 2,
  maxNumberOfSymbols: 0,
};

async function decodeVinFromPhoto(file: File): Promise<string | null> {
  const { prepareZXingModule, readBarcodes } = await import("zxing-wasm/reader");
  // Serve the wasm binary ourselves instead of zxing-wasm's default CDN.
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path,
    },
  });

  // Try full-resolution pixels, then a center crop, then fall back to
  // letting zxing decode the raw file bytes directly.
  const inputs: (ImageData | Blob)[] = [];
  try {
    inputs.push(...(await imageDataVariants(file)));
  } catch {
    // createImageBitmap can't handle every format on every browser — the
    // raw-file fallback below covers those cases.
  }
  inputs.push(file);

  for (const input of inputs) {
    try {
      const results = await readBarcodes(input, READER_OPTIONS);
      for (const result of results) {
        const vin = extractVin(result.text);
        if (vin) return vin;
      }
    } catch {
      // try the next input
    }
  }
  return null;
}

export function VinScanner({ onScan }: { onScan: (vin: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setBusy(true);
    try {
      const vin = await decodeVinFromPhoto(file);
      if (vin) {
        onScan(vin);
        closeModal();
      } else {
        setError(
          "No VIN barcode found. Fill the frame with just the barcode (not the whole sticker), hold steady until it's sharp, avoid glare, then retake."
        );
      }
    } catch (err) {
      console.error("VIN scan failed:", err);
      setError("Couldn't read that photo. Please retake.");
    } finally {
      setBusy(false);
    }
  }

  function closeModal() {
    setError(null);
    setBusy(false);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              Scan VIN
            </h2>

            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Captured VIN photo"
                className="mb-3 w-full rounded-md border border-neutral-200"
              />
            )}

            {busy ? (
              <p className="text-base text-neutral-700">Reading barcode…</p>
            ) : (
              <>
                <p className="text-base text-red-600">{error}</p>
                <div className="mt-4 flex gap-2">
                  <label className="flex-1 cursor-pointer rounded-md bg-neutral-900 px-4 py-2.5 text-center text-base font-medium text-white">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        handlePhoto(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    Retake
                  </label>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-md border border-neutral-300 px-4 py-2.5 text-base font-medium text-neutral-700"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
