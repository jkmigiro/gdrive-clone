import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/auth";
import { connectToDatabase, FileModel } from "@/utils/db";
import { NextResponse } from "next/server";
import File from "@/models/File";
import { UserModel } from "@/utils/db.ts";
import { DefaultUser } from "next-auth";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = session?.user as DefaultUser;
  await connectToDatabase();
  const user = await UserModel.findOne({ email: currentUser.email });
  const files: File[] = await FileModel.find({ userId: user?._id });
  return NextResponse.json(files);
}
