import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "inspector";
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "inspector";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "inspector";
  }
}
