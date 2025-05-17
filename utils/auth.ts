import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "./db.ts";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import { UserModel } from "@/utils/db.ts";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }
        await connectToDatabase();
        const user = await UserModel.findOne({ email: credentials.email });
        if (!user) throw new Error("No user found");
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );
        if (!isValid) throw new Error("Invalid password");
        console.log("Logging user: ", user);
        return { id: user._id.toString(), email: user.email };
      },
    }),
  ],
  pages: {
    signIn: "/api/auth/signin",
    newUser: "/api/auth/signup",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
