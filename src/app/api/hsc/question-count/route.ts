import { supabaseAdmin } from '@/lib/db';

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin
      .from('hsc_questions')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[question-count] Supabase error:', error.message, error.code);
      return Response.json(
        { error: 'Failed to fetch question count', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    return Response.json({ count: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[question-count] Error:', message);
    return Response.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}