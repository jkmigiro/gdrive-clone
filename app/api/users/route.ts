import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase, UserModel } from "@/utils/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: any) {
  console.log("Here in Creating a user");
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Check for existing user
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new UserModel({ email, password: hashedPassword });
    await user.save();

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
