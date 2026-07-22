import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "inspector" | "viewer";
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "inspector" | "viewer";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "inspector" | "viewer";
  }
}
