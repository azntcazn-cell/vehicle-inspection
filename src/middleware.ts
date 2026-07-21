import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Static assets are excluded from auth: uploads and the diagram template
  // so server-side PDF rendering can fetch them without a session cookie
  // (production media lives on Vercel Blob), and the zxing wasm binary so
  // the VIN scanner can always load it as a plain static file.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads|vehicle-diagram.jpg|zxing_reader.wasm).*)",
  ],
};
