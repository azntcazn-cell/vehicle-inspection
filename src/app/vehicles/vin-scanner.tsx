"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission was denied. Allow camera access for this site in your browser settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is in use by another app. Close it and try again.";
    default:
      return "Couldn't access the camera. Check camera permissions and try again.";
  }
}

export function VinScanner({ onScan }: { onScan: (vin: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(
    "Point the camera at the VIN barcode (usually on the driver-door sticker). Hold steady about 6 inches away."
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!open) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser doesn't support camera access (it requires HTTPS)."
      );
      return;
    }

    let cancelled = false;
    const hints = new Map();
    // VIN door-jamb stickers most commonly carry Code 39, Data Matrix, or
    // PDF417 barcodes (QR is rare). TRY_HARDER improves detection of the
    // small, dense codes typical on VIN labels.
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    // Ask for the rear camera explicitly — the default video device on
    // phones is often the front camera — and a high resolution, since VIN
    // barcodes are too dense to resolve at the 640x480 default.
    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current!,
        (result) => {
          if (cancelled || !result) return;
          let text = result.getText().trim().toUpperCase();
          // Code 39 VIN labels often encode an extra leading "I"
          // (import character) — strip it.
          if (text.length === 18 && text.startsWith("I")) {
            text = text.slice(1);
          }
          if (VIN_PATTERN.test(text)) {
            onScan(text);
            setOpen(false);
          } else {
            setStatus(`Scanned "${text}" doesn't look like a valid VIN — keep trying`);
          }
        }
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(cameraErrorMessage(err));
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onScan]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setStatus(
            "Point the camera at the VIN barcode (usually on the driver-door sticker). Hold steady about 6 inches away."
          );
          setOpen(true);
        }}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        📷 Scan VIN
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Scan VIN</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-neutral-500 hover:text-neutral-900"
              >
                Cancel
              </button>
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="aspect-video w-full rounded-md bg-neutral-900"
                  autoPlay
                  muted
                  playsInline
                />
                <p className="mt-2 text-xs text-neutral-500">{status}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
