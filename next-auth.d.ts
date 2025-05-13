import { User as DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
  }

  interface Session {
    user: User;
  }
}
