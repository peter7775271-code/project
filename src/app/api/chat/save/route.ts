import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { message, role } = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    // Verify user is authenticated
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validate input
    if (!message || !role) {
      return NextResponse.json(
        { error: 'Message and role are required' },
        { status: 400 }
      );
    }

    // Save to database
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert([
        {
          user_id: decoded.userId,
          message,
          role,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Save message error:', error);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Save chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
