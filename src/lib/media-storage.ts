import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

// Extension is derived from the validated MIME type, never from the
// user-supplied filename — a crafted filename (e.g. containing "../")
// could otherwise escape the uploads directory.
const EXTENSIONS_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-msvideo": "avi",
};

export async function storeMedia(file: File): Promise<string> {
  const ext = EXTENSIONS_BY_MIME[file.type] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`inspections/${filename}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  // Local dev fallback — Vercel's filesystem is ephemeral in production,
  // so this path only runs when BLOB_READ_WRITE_TOKEN is unset.
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}
