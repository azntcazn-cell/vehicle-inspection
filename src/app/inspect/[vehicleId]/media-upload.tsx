"use client";

import { useState } from "react";
import { uploadMediaFile } from "@/lib/upload-client";

type MediaItem = { url: string; type: "image" | "video" };

export function MediaUpload({
  itemId,
  initialMedia,
}: {
  itemId: number;
  initialMedia?: MediaItem[];
}) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: MediaItem[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadMediaFile(file));
      }
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `Upload failed: ${err.message}`
          : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(url: string) {
    setMedia((prev) => prev.filter((m) => m.url !== url));
  }

  return (
    <div className="mt-2">
      <input type="hidden" name={`media-${itemId}`} value={JSON.stringify(media)} readOnly />

      <div className="flex flex-wrap items-center gap-2">
        {/* sr-only, not display:none — iOS Safari ignores label taps that
            target a display:none file input, so the camera never opens.
            Each capture input accepts a SINGLE media type: with a mixed
            accept list (image/*,video/*) mobile browsers ignore the
            capture hint and open the file picker instead of the camera. */}
        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          📷 Photo
        </label>

        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100">
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          🎥 Video
        </label>

        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100">
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          🖼️ Gallery
        </label>

        {uploading && <span className="text-xs text-neutral-400">Uploading…</span>}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {media.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {media.map((m) => (
            <div key={m.url} className="group relative">
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt=""
                  className="h-16 w-16 rounded-md border border-neutral-200 object-cover"
                />
              ) : (
                <video
                  src={m.url}
                  muted
                  className="h-16 w-16 rounded-md border border-neutral-200 object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removeMedia(m.url)}
                aria-label="Remove"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
