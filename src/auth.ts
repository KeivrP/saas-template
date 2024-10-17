import NextAuth from "next-auth"

import { env } from "@/env.mjs"
import authConfig from "@/config/auth"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  debug: env.NODE_ENV === "development",
  pages: {
    signIn: "/signin",
    signOut: "/signout",
    verifyRequest: "/signin/magic-link-signin",
  },
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  events: {
    async linkAccount({ user }) {},
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as "USER" | "ADMIN"
      return session
    },
    signIn({ user, account }) {
      if (!user.id) return false
      if (account?.provider !== "credentials") return true

      const existingUser: { emailVerified?: boolean } | null = null
      try {
        /*         existingUser = await getUserById({ id: user.id }); */
        console.log("existingUser", existingUser)
      } catch (error) {
        console.error("Error fetching user by ID:", error)
        return false
      }

      return !existingUser ? false : true
    },
  },
  // Remove Prisma adapter and add any necessary Strapi or Nest.js configurations here
  ...authConfig,
})
