import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { PrismaClient } from "@prisma/client";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      // `credentials` is used to generate a form on the sign in page.
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "johndoe@mail.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "*******",
        },
      },
      async authorize(credentials, req) {
        console.log(credentials);
        if (credentials?.email && credentials?.password) {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });
          console.log(credentials.password);
          if (
            user &&
            bcrypt.compareSync(
              credentials.password as string,
              user.password as string,
            )
          ) {
            return user;
          } else {
            return null;
          }
        } else {
          return null;
        }
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },

  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
