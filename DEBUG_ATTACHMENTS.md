# Attachment Data Debug Guide

## How to Test and Debug

### 1. Open Developer Console
- Press **F12** or right-click → **Inspect**
- Go to **Console** tab
- Leave it open while testing

### 2. Upload an Image
1. Go to chat
2. Click the attachment button (📎)
3. Select an image file (e.g., small PNG or JPG under 5MB)
4. Type a message (optional)
5. Send

### 3. Watch the Console for These Logs

You should see logs like:
```
[convertToBase64] Success: { fileName: "...", fileSize: 12345, base64Length: 16460, ... }
[SAVE PAYLOAD] Sending: { hasAttachment: true, attachmentSize: 16460, ... }
[SAVE RESPONSE] Status: 200
[SAVE SUCCESS] Message saved: { hasAttachmentInResponse: true, attachmentSizeInResponse: 16460, ... }
```

### 4. Look for Problems

#### Problem 1: "attachmentSize: 0"
- **Cause**: File didn't convert to base64
- **Fix**: Check browser console errors, try different file type

#### Problem 2: "attachmentSize: [large number]" → "[SAVE ERROR]"
- **Cause**: API request failed
- **Fix**: Check server logs (terminal) for [SAVE API] logs, look for error details

#### Problem 3: "[SAVE SUCCESS] ... hasAttachmentInResponse: false"
- **Cause**: Attachment was sent but not saved to database
- **Fix**: Check server logs for [SAVE API] logs, verify Supabase columns exist

#### Problem 4: Can see image in chat, closes app, reopens → no image
- **Cause**: Image was saved but not loading from database
- **Fix**: Check [Loaded chat data] logs, verify `attachment` field is populated

---

## Check Server Logs

In your terminal where `npm run dev` is running, look for:
```
[SAVE API] Received: { hasAttachment: true, attachmentSize: ... }
[SAVE API] About to insert: { hasAttachment: true, ... }
[SAVE API] Insert successful: { rowCount: 1, hasAttachmentInResponse: true, ... }
```

---

## Verify in Supabase

1. Open Supabase Dashboard
2. Go to **Table Editor** → **chat_messages**
3. Find your message
4. Look at `attachment` column - should have long base64 string, NOT NULL
5. Look at `file_name` column - should have filename like "image.png"

---

## Report Back With:

If it's still not working, share:
1. The console logs (screenshot or copy-paste)
2. The server logs (what you see in terminal)
3. What you see in Supabase table (is attachment NULL or populated?)
4. File type and size you're trying to upload

This will help identify exactly where the data is getting lost!
