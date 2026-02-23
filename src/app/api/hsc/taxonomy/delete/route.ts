import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * DELETE /api/hsc/taxonomy/delete
 *
 * Body: { id: string }  — deletes a single taxonomy row by UUID
 * Body: { ids: string[] } — deletes multiple taxonomy rows
 */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const singleId = typeof body?.id === 'string' ? body.id.trim() : '';
        const multipleIds: string[] = Array.isArray(body?.ids)
            ? body.ids.map((id: unknown) => String(id).trim()).filter(Boolean)
            : [];

        const idsToDelete = singleId ? [singleId] : multipleIds;

        if (idsToDelete.length === 0) {
            return NextResponse.json(
                { error: 'id or ids[] is required' },
                { status: 400 }
            );
        }

        const { error, count } = await supabaseAdmin
            .from('syllabus_taxonomy')
            .delete()
            .in('id', idsToDelete);

        if (error) {
            console.error('[taxonomy/delete] Supabase error:', error.message);
            return NextResponse.json(
                { error: `Failed to delete: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, deleted: count ?? idsToDelete.length });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[taxonomy/delete] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
