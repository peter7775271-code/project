#!/usr/bin/env node

/**
 * Supabase Setup Script
 * 
 * This script helps you set up your Supabase project with the required tables and columns.
 * 
 * Usage: node scripts/setup-supabase.js
 * 
 * You'll need to:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Get your service role key from Settings → API
 * 3. Run this script to create the tables
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function setupSupabase() {
  console.log('\n🚀 Supabase Project Setup\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '❌ Missing Supabase credentials.\n' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n'
    );
    process.exit(1);
  }

  console.log(`✓ Using Supabase URL: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('Creating users table...');

    // SQL to create the users table with correct column types
    const sql = `
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        verified BOOLEAN DEFAULT false,
        verification_token TEXT,
        created_at TIMESTAMP DEFAULT now(),
        reset_token TEXT,
        reset_token_expiry TIMESTAMP
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_verification_token ON users(verification_token);
      CREATE INDEX idx_users_reset_token ON users(reset_token);

      -- Enable Row Level Security
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;

      -- Create a policy to allow all operations (development only)
      CREATE POLICY "Allow all operations" ON users
        FOR ALL USING (true) WITH CHECK (true);
    `;

    // Execute the SQL using the admin client
    const { error } = await supabase.rpc('execute_sql', { sql });

    if (error) {
      // Try using exec function instead
      console.log('Attempting alternative setup method...');
      
      // For now, provide instructions for manual setup
      console.log('\n⚠️  Could not execute SQL directly. Please create the table manually:\n');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Click "SQL Editor" on the left');
      console.log('3. Click "New Query"');
      console.log('4. Paste the following SQL and click "RUN":\n');
      console.log(sql);
      console.log('\n');
      return;
    }

    console.log('✅ Users table created successfully!\n');
    console.log('Your Supabase project is now ready to use.\n');
    console.log('Next steps:');
    console.log('1. Verify your .env.local has the correct credentials');
    console.log('2. Run: npm run dev');
    console.log('3. Test the sign-up form\n');

  } catch (error) {
    console.error('Error setting up Supabase:', error.message);
    console.log('\n📖 Manual Setup Instructions:');
    console.log('1. Go to https://supabase.com and sign in');
    console.log('2. Click on your project');
    console.log('3. Click "SQL Editor" → "New Query"');
    console.log('4. Copy and paste the SQL from SUPABASE_SETUP.md');
    console.log('5. Click "RUN"\n');
  } finally {
    rl.close();
  }
}

setupSupabase();
