import type { NextAuthConfig } from "next-auth";

// Config shared with middleware, which runs on the Edge runtime — this file
// must stay free of Node-only imports (db client, bcrypt). The Credentials
// provider (which needs those) is added separately in auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith("/login");

      // Middleware only sees the JWT, not live DB state, so it can't tell
      // a deactivated user's still-valid-looking token from an active
      // one. It must never redirect a request AWAY from /login — pages
      // use requireSession() to send deactivated/stale sessions back to
      // /login, and bouncing them off /login here would create a loop.
      if (!isLoggedIn && !isLoginPage) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
