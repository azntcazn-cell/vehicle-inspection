"use client";

import { upload } from "@vercel/blob/client";
import { uploadInspectionMedia } from "@/app/inspect/actions";

// In production (Vercel Blob configured) the browser uploads directly to Blob
// storage so large files bypass the serverless body-size limits. Locally,
// where no Blob token exists, fall back to the server action that writes to
// public/uploads.
const blobEnabled = process.env.NEXT_PUBLIC_BLOB_ENABLED === "1";

export type UploadedMedia = { url: string; type: "image" | "video" };

export async function uploadMediaFile(file: File): Promise<UploadedMedia> {
  const type: "image" | "video" = file.type.startsWith("video/")
    ? "video"
    : "image";

  if (blobEnabled) {
    const ext = file.name.includes(".")
      ? file.name.split(".").pop()!.replace(/[^a-z0-9]/gi, "").slice(0, 5)
      : "bin";
    const blob = await upload(`inspections/upload.${ext || "bin"}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType: file.type || undefined,
    });
    return { url: blob.url, type };
  }

  const fd = new FormData();
  fd.set("file", file);
  return uploadInspectionMedia(fd);
}
