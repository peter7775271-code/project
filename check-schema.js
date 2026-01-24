// Quick script to check if attachment columns exist in your Supabase table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking chat_messages table schema...\n');
    
    // Try to insert a test row with attachment
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000', // UUID placeholder
        message: 'test',
        role: 'user',
        attachment: null,
        file_name: null,
      }])
      .select();

    if (error) {
      if (error.message.includes('attachment') || error.message.includes('file_name')) {
        console.error('❌ COLUMNS NOT FOUND');
        console.error('The "attachment" or "file_name" columns do not exist in your chat_messages table.');
        console.error('\nRun this SQL in your Supabase dashboard:');
        console.error(`
ALTER TABLE chat_messages 
ADD COLUMN attachment TEXT, 
ADD COLUMN file_name TEXT;
        `);
      } else {
        console.error('❌ Error:', error.message);
      }
      return false;
    } else {
      console.log('✅ Columns exist! Successfully inserted test row with attachment fields.');
      console.log('✅ Chat messages table is properly configured for file attachments.');
      
      // Clean up test row
      if (data && data[0]) {
        await supabase
          .from('chat_messages')
          .delete()
          .eq('id', data[0].id);
      }
      return true;
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

checkSchema().then(success => {
  process.exit(success ? 0 : 1);
});
