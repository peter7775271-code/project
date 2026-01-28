import { supabaseAdmin } from '@/lib/db';

export async function POST(request: Request) {
  try {

    const body = await request.json();
    const { questionId } = body;

    // Validate required fields
    if (!questionId) {
      return Response.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Delete from database
    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .delete()
      .eq('id', questionId)
      .select();

    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to delete question: ' + error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Question deleted successfully',
      data,
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
