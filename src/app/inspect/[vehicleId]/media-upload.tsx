"use client";

import { useState } from "react";
import { uploadInspectionMedia } from "../actions";

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
        const fd = new FormData();
        fd.set("file", file);
        uploaded.push(await uploadInspectionMedia(fd));
      }
      setMedia((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Upload failed. Please try again.");
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

      <div className="flex items-center gap-3">
        {/* sr-only, not display:none — iOS Safari ignores label taps that
            target a display:none file input, so the camera never opens. */}
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900">
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          📷 Camera
        </label>

        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900">
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
