import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { message, role, attachment, fileName } = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    console.log('[SAVE API] Received:', {
      messageLength: message?.length,
      role,
      hasAttachment: !!attachment,
      attachmentSize: attachment?.length,
      fileName,
    });

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
      console.error('[SAVE API] Validation failed:', { message, role });
      return NextResponse.json(
        { error: 'Message and role are required' },
        { status: 400 }
      );
    }

    const insertData = {
      user_id: decoded.userId,
      message,
      role,
      attachment: attachment || null,
      file_name: fileName || null,
      created_at: new Date().toISOString(),
    };

    console.log('[SAVE API] About to insert:', {
      hasAttachment: !!insertData.attachment,
      attachmentSize: insertData.attachment?.length,
      fileName: insertData.file_name,
    });

    // Save to database
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert([insertData])
      .select();

    if (error) {
      console.error('[SAVE API] Supabase error:', error);
      return NextResponse.json(
        { error: `Failed to save message: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[SAVE API] Insert successful:', {
      rowCount: data?.length,
      hasAttachmentInResponse: !!data?.[0]?.attachment,
      attachmentSizeInResponse: data?.[0]?.attachment?.length,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[SAVE API] Catch error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
