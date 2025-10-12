import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // keep on while fixing
  // pages: { signIn: "/auth/signin" }, // only if you CREATED app/auth/signin/page.tsx
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
