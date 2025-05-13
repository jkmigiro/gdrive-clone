import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/auth";
import { connectToDatabase, FileModel } from "@/utils/db";
import { NextResponse } from "next/server";
import File from "@/models/File";
import { DefaultUser } from "next-auth";
import { UserModel } from "@/utils/db.ts";
import { Types } from "mongoose";

interface RenameRequest {
  email: string;
  id: string;
  newName: string;
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = session?.user as DefaultUser;
  const user = await UserModel.findOne({ email: currentUser.email });
  const { newName, id }: RenameRequest = await req.json();
  console.log(
    "Renaming file with newName: ",
    newName,
    " and user: ",
    user,
    " ID: ",
    id,
  );
  if (!id || !newName) {
    console.log("Kwani rada");
    return NextResponse.json(
      { error: "ID and new name required" },
      { status: 400 },
    );
  }

  await connectToDatabase();
  const file: File | null = await FileModel.findOneAndUpdate(
    { _id: Types.ObjectId.createFromHexString(id) },
    { name: newName },
    { new: true },
  );
  console.log("Id for file: ", Types.ObjectId.createFromHexString(id));
  console.log("File is this: ", file, " for currentUser: ", user?._id);

  if (!file)
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  return NextResponse.json({ message: "File renamed", file });
}
