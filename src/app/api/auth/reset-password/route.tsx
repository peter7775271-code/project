import { supabaseAdmin } from "@/lib/db";
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
    
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('email, reset_token_expiry')
      .eq('reset_token', token)
      .single();
    
    if (findError || !user) {
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
    await supabaseAdmin
      .from('users')
      .update({
        reset_token: null,
        reset_token_expiry: null
      })
      .eq('email', user.email);

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