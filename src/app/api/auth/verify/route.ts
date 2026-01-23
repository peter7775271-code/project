import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db"; // adjust to your DB import

// Verifies a user's email using token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    // find user by token
    const user = db
      .prepare<[string], { id: number }>(
        `SELECT id FROM users WHERE verification_token = ?`
      ).get(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

      // mark verified
    db.prepare(`
      UPDATE users
      SET verified = 1,
          verification_token = NULL
      WHERE id = ?
    `).run(user.id);

    // redirect to dashboard after success
    return NextResponse.redirect(new URL("/login", request.url));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
