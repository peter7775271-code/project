import { supabaseAdmin } from '@/lib/db';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[all-questions] Supabase error:', error.message, error.code);
      return Response.json(
        { error: 'Failed to fetch questions', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    return Response.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[all-questions] Error:', message);
    return Response.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
