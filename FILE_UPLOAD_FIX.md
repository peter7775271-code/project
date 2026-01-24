# File Upload Fix - Database Migration

## Problem Fixed
File uploads were not being saved to Supabase. When users uploaded files/images with their chat messages, the files were sent to ChatGPT but not persisted in the database, so they couldn't be loaded in future sessions.

## Solution
Added support for storing file attachments in the Supabase `chat_messages` table.

## Changes Made

### 1. **Database Schema Update** (REQUIRED ACTION)
Run this SQL in your Supabase dashboard to add file attachment support:

```sql
-- Add new columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN attachment TEXT, 
ADD COLUMN file_name TEXT;
```

Or if you're setting up a fresh database, use the schema from [CHAT_DATABASE_SETUP.md](CHAT_DATABASE_SETUP.md) which includes these columns.

### 2. **API Updates**
- **`/api/chat/save`** - Now accepts and stores `attachment` and `fileName` fields
- **`/api/chat/load`** - Already returns all columns including attachments

### 3. **Dashboard Updates**
- When saving messages, file attachments are now included
- When loading chat history, attachments are properly reconstructed and displayed

## What Gets Saved
- **Images** - Stored as base64 data, displayed inline in chat history
- **Text Files** (.txt, .js, .md, .pdf, etc.) - Stored as base64 with filename, shown as file badges in chat
- **All metadata** - Original filename, file type, and creation timestamps

## How to Apply

1. **Update your Supabase table** with the SQL above
2. **Redeploy** your Next.js application
3. **Test** by uploading a file in the chat - it should now persist across sessions

## Testing Checklist
- [ ] Add a new row to `chat_messages` with `attachment` and `file_name` values
- [ ] Upload an image in chat and verify it saves
- [ ] Upload a text file in chat and verify it saves  
- [ ] Close and reopen the chat, verify files are loaded and displayed
- [ ] Check Supabase table to confirm attachment data is stored

## Database Schema

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, auto-generated |
| user_id | UUID | Links to users table, cascade delete |
| message | TEXT | The actual message content |
| role | TEXT | Either 'user' or 'assistant' |
| attachment | TEXT | **NEW** - Base64-encoded file or image data (optional) |
| file_name | TEXT | **NEW** - Original filename for non-image attachments (optional) |
| created_at | TIMESTAMP | Auto-generated creation time |

## Files Modified
- `src/app/api/chat/save/route.ts` - Updated to handle attachment data
- `src/app/dashboard/page.tsx` - Updated to send and load attachments
- `CHAT_DATABASE_SETUP.md` - Updated with new schema

## Rollback (if needed)
If you need to revert, you can remove the columns:
```sql
ALTER TABLE chat_messages 
DROP COLUMN attachment,
DROP COLUMN file_name;
```
