# ⚠️ CRITICAL: Database Migration Required

## Problem
Images/files aren't loading because **the database columns haven't been created yet**.

The code changes were committed, but the SQL migration in Supabase was skipped.

## Solution - Run This NOW in Supabase

### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com → Select Your Project → SQL Editor

### Step 2: Run This SQL
Copy and paste this exact SQL and click "Run":

```sql
ALTER TABLE chat_messages 
ADD COLUMN attachment TEXT, 
ADD COLUMN file_name TEXT;
```

**That's it!** This adds the two columns needed to store file attachments.

### Step 3: Verify (Optional)
After running the SQL, you should see:
- ✅ `attachment` column (TEXT type)
- ✅ `file_name` column (TEXT type)

In the Table Editor, click on `chat_messages` table and you should see these new columns listed.

## What This Does
- `attachment` - Stores base64-encoded image/file data
- `file_name` - Stores the original filename

## After Migration
1. **Restart your dev server** (or it will auto-reload)
2. **Upload an image** in the chat
3. **Close and reopen** the chat
4. **Your image should now load** from the database

## Troubleshooting

### If you see an error like "column already exists"
- The columns were already added - proceed to step 3 above

### If images still don't load after migration
- Check browser DevTools Console (F12)
- Look for error messages like "attachment data too large"
- Verify the image was actually saved by checking Supabase Table Editor

### To see what was saved
1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Click "chat_messages"
4. Look for your messages with non-NULL `attachment` and `file_name` values

---

**This must be done before file uploads will work!**
