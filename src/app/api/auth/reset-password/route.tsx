import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { updateUserPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    
    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    
    const user = db.prepare(`SELECT email, reset_token_expiry FROM users WHERE reset_token = ?`).get(token) as any;
    
    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const now = new Date();
    if (user.reset_token_expiry && new Date(user.reset_token_expiry) < now) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      );
    }

    // Update password and clear reset token
    await updateUserPassword(user.email, password);
    db.prepare(`UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE email = ?`).run(user.email);

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 500 }
    );
  }
}