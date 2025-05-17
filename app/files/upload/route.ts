import { getServerSession } from "next-auth/next";
// import { DefaultUser } from "next-auth";
import { authOptions } from "@/utils/auth";
import { connectToDatabase, FileModel } from "@/utils/db";
import { saveFile } from "@/utils/store";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { UserModel } from "@/utils/db.ts";
export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = session?.user;

  const formData = await req.formData();
  const file = formData.get("file") as globalThis.File;
  const parentId = formData.get("parentId") as string;

  if (!file)
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  await connectToDatabase();
  const fileName = `${Date.now()}_${file.name}`;
  let filePath;
  const user = await UserModel.findOne({ email: currentUser.email });
  if (currentUser?.email) {
    if (user && user._id) {
      filePath = await saveFile(
        Buffer.from(await file.arrayBuffer()),
        user._id.toString(),
        fileName,
      );
    }
  } else {
    redirect("/api/auth/signin");
    return NextResponse.json(
      { error: "You are unauthorized to do this transaction" },
      { status: 401 },
    );
  }

  const fileDoc = new FileModel({
    name: file.name,
    type: "file",
    path: filePath,
    userId: user?._id,
    parentId: parentId || null,
    size: file.size,
    mimeType: file.type,
  });

  await fileDoc.save();
  return NextResponse.json({ message: "File uploaded", file: fileDoc });
}
