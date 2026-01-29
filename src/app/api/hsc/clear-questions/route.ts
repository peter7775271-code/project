import { supabaseAdmin } from '@/lib/db';

export async function POST() {
  try {
    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (error) {
      return Response.json(
        { error: 'Failed to clear questions', details: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      deleted: data?.length || 0,
    });
  } catch (error) {
    return Response.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
