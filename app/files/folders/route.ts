import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/auth";
import { connectToDatabase, FileModel } from "@/utils/db";
import { NextResponse } from "next/server";
import { DefaultUser } from "next-auth";
import { UserModel } from "@/utils/db.ts";
interface FolderRequest {
  name: string;
  parentId?: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: any) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = session?.user as DefaultUser;

  const { name, parentId }: FolderRequest = await req.json();
  if (!name)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });

  await connectToDatabase();
  const user = await UserModel.findOne({ email: currentUser.email });
  const existingFolder = await FileModel.findOne({
    name,
    type: "folder",
    userId: user?._id,
    parentId: parentId || null,
  });

  if (existingFolder) {
    return NextResponse.json(
      { error: "Folder with this name already exists." },
      { status: 409 },
    );
  }
  const folder = new FileModel({
    name,
    type: "folder",
    userId: user?._id,
    parentId: parentId || null,
  });

  await folder.save();
  return NextResponse.json({ message: "Folder created", folder });
}
