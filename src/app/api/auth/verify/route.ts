import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

// Verifies a user's email using token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    // find user by token
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('verification_token', token)
      .single();

    if (findError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // mark verified
    await supabaseAdmin
      .from('users')
      .update({
        verified: true,
        verification_token: null
      })
      .eq('id', user.id);

    // redirect to dashboard after success
    return NextResponse.redirect(new URL("/login", request.url));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
