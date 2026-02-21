import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message, file, fileName } = await request.json();

    // Define the message structure
    let userMessageContent: any[] = [];

    // 1. Add the User's text message if it exists
    if (message) {
      userMessageContent.push({ type: "text", text: message });
    }

    // 2. Handle File Attachment
    if (file) {
      // Check if it's an image (based on the Base64 prefix)
      if (file.startsWith('data:image')) {
        // --- IMAGE HANDLING (GPT-5.2 Vision) ---
        userMessageContent.push({
          type: "image_url",
          image_url: {
            url: file, // OpenAI accepts the base64 data string directly
          },
        });
      } else {
        // --- TEXT FILE HANDLING (.txt, .js, .md, etc.) ---
        // Decode base64 to text
        try {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64Data = file.split(',')[1];
          const fileText = Buffer.from(base64Data, 'base64').toString('utf-8');
          
          userMessageContent.push({
            type: "text",
            text: `\n\n--- Content of file: ${fileName} ---\n${fileText}\n--- End of file ---`,
          });
        } catch (e) {
          console.error("Error decoding file", e);
          return NextResponse.json({ error: 'Could not read file content' }, { status: 400 });
        }
      }
    }

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userMessageContent as any },
      ],
    });

    const reply = completion.choices[0].message.content;
    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('OpenAI Error:', error);
    return NextResponse.json({ error: error.message || 'Error processing request' }, { status: 500 });
  }
}