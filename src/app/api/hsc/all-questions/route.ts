import { supabaseAdmin } from '@/lib/db';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json(
        { error: 'Failed to fetch questions', details: error.message },
        { status: 500 }
      );
    }

    return Response.json(data || []);
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
