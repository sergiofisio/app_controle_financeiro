import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  appName: "Finanças em Família",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.authShareLink.create({
        data: {
          type: "PASSWORD_RESET",
          email: user.email,
          url,
          expiresAt,
          userId: user.id,
        },
      });
    },
  },
  user: {
    additionalFields: {
      preferences: {
        type: "json",
        required: false,
        input: true,
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
