import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/auth";
import { connectToDatabase, FileModel } from "@/utils/db";
import { NextResponse } from "next/server";
import File from "@/models/File";
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
  const { newName, id }: RenameRequest = await req.json();
  if (!id || !newName) {
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

  if (!file)
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  return NextResponse.json({ message: "File renamed", file });
}
