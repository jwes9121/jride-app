import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // enable debug logs
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always redirect back to baseUrl (production or dev)
      return baseUrl;
    },
  },
});

export { handler as GET, handler as POST };
