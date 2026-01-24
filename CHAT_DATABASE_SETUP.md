# Chat Messages Database Setup

Your chat application now saves all conversations to Supabase! Follow these steps to set up the database table.

## 🚀 Create the Chat Messages Table

Go to your Supabase dashboard and run this SQL in the **SQL Editor**:

```sql
-- Create chat_messages table with file attachment support
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  attachment TEXT, -- Stores base64-encoded file data or image data
  file_name TEXT, -- Original filename for non-image files
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_user_created ON chat_messages(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own messages
CREATE POLICY "Users can see their own messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own messages
CREATE POLICY "Users can insert their own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## ✨ Features

- ✅ **Auto-save**: Every message (user and assistant) is automatically saved
- ✅ **Load history**: Previous conversations load when you open the chat
- ✅ **Persistent**: Chat history persists across sessions
- ✅ **User-specific**: Each user only sees their own chat messages
- ✅ **Timestamped**: All messages include creation timestamps

## 📋 API Endpoints

### Save a Message
```
POST /api/chat/save
Headers: Authorization: Bearer <token>
Body: { "message": "text", "role": "user|assistant" }
```

### Load Chat History
```
GET /api/chat/load
Headers: Authorization: Bearer <token>
Returns: { "messages": [...] }
```

## 🔍 View Your Chat History

In Supabase:
1. Go to **Table Editor**
2. Click on **chat_messages**
3. See all your saved conversations with timestamps

You can also query with SQL:
```sql
SELECT * FROM chat_messages 
WHERE user_id = 'user-uuid-here' 
ORDER BY created_at DESC;
```

## 🚀 Don't Forget Vercel!

The table creation and RLS policies are Supabase-specific and don't need any environment variables. Your existing setup already has everything needed!

## 📊 Database Schema

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, auto-generated |
| user_id | UUID | Links to users table, cascade delete |
| message | TEXT | The actual message content |
| role | TEXT | Either 'user' or 'assistant' |
| attachment | TEXT | Base64-encoded file or image data (optional) |
| file_name | TEXT | Original filename for non-image attachments (optional) |
| created_at | TIMESTAMP | Auto-generated creation time |
