import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/auth";
import { connectToDatabase, FileModel, UserModel } from "@/utils/db";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import File from "@/models/File";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const user = await UserModel.findOne({ email: session?.user.email });
  const { id } = await params;
  const file: File | null = await FileModel.findOne({
    _id: id,
    userId: user?._id,
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.type !== "file" || !file.path) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  try {
    const fileBuffer = await fs.readFile(file.path);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": file.size?.toString() || fileBuffer.length.toString(),
        "Content-Disposition": `inline; filename="${file.name}"`,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
