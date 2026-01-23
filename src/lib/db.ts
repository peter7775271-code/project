import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize database connection only if credentials are available
let supabaseAdminInstance: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey);
}

// Create a safe mock for build time or when credentials are missing
const mockClient = {
  from: () => ({
    select: () => ({ 
      eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized - check environment variables') }) }),
      single: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized - check environment variables') }),
      limit: () => Promise.resolve({ data: [], error: new Error('Supabase not initialized - check environment variables') }),
    }),
    insert: () => ({ 
      select: () => ({ 
        single: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized - check environment variables') }) 
      }),
    }),
    update: () => ({ 
      eq: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized - check environment variables') }),
    }),
  }),
};

// Export with fallback for build time
export const supabaseAdmin = supabaseAdminInstance || mockClient;

// Initialize database schema (Supabase tables)
export async function initializeDb() {
  // Verify that the users table exists by trying a simple query
  if (supabaseAdminInstance) {
    try {
      const { error } = await supabaseAdminInstance
        .from('users')
        .select('id')
        .limit(1);

      if (error?.code === 'PGRST116') {
        // Table doesn't exist
        console.error(
          '❌ SETUP REQUIRED: The "users" table does not exist in your Supabase project.\n' +
          'Please create the table using the SQL query from SUPABASE_SETUP.md\n' +
          'Or run the SQL in your Supabase dashboard → SQL Editor'
        );
      } else if (error) {
        console.warn('⚠️  Supabase connection warning:', error.message);
      } else {
        console.log('✅ Supabase users table verified');
      }
    } catch (err) {
      console.log('ℹ️  Supabase connection initialized');
    }
  }
}

// Initialize on import
if (typeof window === 'undefined') {
  // Only run on server
  initializeDb();
}
