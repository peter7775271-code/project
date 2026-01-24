# IMPORTANT: Attachment Column Size Issue

## Potential Problem
PostgreSQL TEXT columns have a theoretical limit of 1GB, but in practice Supabase may have request size limits that prevent very large base64 strings from being saved.

## Solution

If attachments are still coming back as NULL after all the debugging, your `attachment` column might need to be changed to a larger type.

### Run This in Supabase SQL Editor:

```sql
-- Option 1: If TEXT column isn't working, try LONGTEXT (recommended for base64)
ALTER TABLE chat_messages 
ALTER COLUMN attachment TYPE TEXT USING attachment::TEXT;

-- Option 2: Or create a new column and migrate (safer)
ALTER TABLE chat_messages 
ADD COLUMN attachment_new TEXT;

-- Copy existing data
UPDATE chat_messages SET attachment_new = attachment WHERE attachment IS NOT NULL;

-- Drop old and rename
ALTER TABLE chat_messages DROP COLUMN attachment;
ALTER TABLE chat_messages RENAME COLUMN attachment_new TO attachment;
```

## File Size Limits

For reference:
- **Small image (100KB)** → ~133KB base64 ✅ Definitely works
- **Medium image (1MB)** → ~1.3MB base64 ✅ Should work
- **Large image (5MB)** → ~6.7MB base64 ⚠️ May fail
- **Large image (10MB)** → ~13MB base64 ❌ Likely to fail

## Check If This Is The Issue

In your server logs, look for errors like:
- "Payload too large"
- "Request entity too large"
- "413"
- "413 Payload Too Large"

If you see these, the issue is file size and you'll need to:
1. Reduce max file size from 10MB to 5MB
2. Implement image compression before base64 encoding
3. Or use Supabase Storage instead of storing in database

## Current Implementation
- Max file size: 10MB (set in handleFileSelect)
- Storage: In TEXT column (PostgreSQL TEXT can hold ~1GB)
- Encoding: Base64

If you're uploading files larger than 5-7MB, try smaller files first to confirm this is the issue.
