import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/auth";
import { connectToDatabase, FileModel } from "@/utils/db";
import { deleteFile } from "@/utils/store";
import { NextResponse } from "next/server";
import File from "@/models/File";
import { DefaultUser } from "next-auth";

interface DeleteRequest {
  id: string;
  email: string;
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const json = await req.json();
  const { id }: DeleteRequest = json;
  console.log("JSON is: ", json);
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const currentUser = session?.user as DefaultUser;
  console.log("Deleting for: ", currentUser.email, " ID: ", id);

  const file: File | null = await FileModel.findOne({
    _id: id,
  });
  if (!file)
    return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (file.type === "file") {
    await deleteFile(file.path!);
  } else {
    const children: File[] = await FileModel.find({ parentId: id });
    if (children.length > 0) {
      return NextResponse.json(
        { error: "Folder is not empty" },
        { status: 400 },
      );
    }
  }

  await FileModel.deleteOne({ _id: id });
  return NextResponse.json({ message: "File deleted" });
}
