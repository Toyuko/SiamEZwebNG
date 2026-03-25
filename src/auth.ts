/**
 * Auth.js (NextAuth v5) configuration for SiamEZ.
 * Supports: Credentials, Google, Facebook, LINE.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Line from "next-auth/providers/line";
import { PrismaAdapter } from "@auth/prisma-adapter";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

/** Required by Auth.js assertConfig; env vars may be unset in minimal .env files. */
const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV !== "production"
    ? "local-dev-only-auth-secret-not-for-production"
    : undefined);

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  secret: authSecret,
  adapter: PrismaAdapter(prisma),
  // JWT required for Credentials; OAuth still uses the adapter for User/Account.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;
        if (!user.active) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ? [
          Facebook({
            clientId: process.env.AUTH_FACEBOOK_ID,
            clientSecret: process.env.AUTH_FACEBOOK_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_LINE_ID && process.env.AUTH_LINE_SECRET
      ? [
          Line({
            clientId: process.env.AUTH_LINE_ID,
            clientSecret: process.env.AUTH_LINE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        token.role = dbUser?.role ?? "customer";
        token.picture = dbUser?.image ?? user.image ?? undefined;
      }
      return token;
    },
    // OAuth: link by email or providerId via allowDangerousEmailAccountLinking
    // New users created by adapter; role set in createUser event
    async session({ session, token }) {
      const userId = token.sub;
      if (session.user && userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
        });
        session.user.id = userId;
        (session.user as { role?: string }).role =
          dbUser?.role ?? (typeof token.role === "string" ? token.role : "customer");
        (session.user as { image?: string | null }).image =
          dbUser?.image ?? (typeof token.picture === "string" ? token.picture : null) ?? session.user.image;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // New OAuth user: ensure role = customer (default in schema, but explicit here)
      await prisma.user.update({
        where: { id: user.id! },
        data: { role: "customer" },
      });
    },
  },
});
