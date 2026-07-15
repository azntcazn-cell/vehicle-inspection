import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // uploads is excluded so server-side PDF rendering can fetch local-dev
  // media files without a session cookie (production media lives on
  // Vercel Blob and never passes through this middleware).
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)"],
};
