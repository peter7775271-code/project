import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS ?? 20000);
const SUPABASE_FETCH_RETRIES = Number(process.env.SUPABASE_FETCH_RETRIES ?? 3);
const SUPABASE_FETCH_RETRY_DELAY_MS = Number(process.env.SUPABASE_FETCH_RETRY_DELAY_MS ?? 350);
const RETRYABLE_SUPABASE_FETCH_ERROR = /(fetch failed|connect timeout|timeout|timed out|UND_ERR_CONNECT_TIMEOUT|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up)/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableFetchError = (error: unknown) => {
  if (!error) return false;
  if (error instanceof Error) return RETRYABLE_SUPABASE_FETCH_ERROR.test(error.message);
  return RETRYABLE_SUPABASE_FETCH_ERROR.test(String(error));
};

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const resilientSupabaseFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= SUPABASE_FETCH_RETRIES; attempt += 1) {
    try {
      return await fetchWithTimeout(input, init);
    } catch (error) {
      lastError = error;
      if (!isRetryableFetchError(error) || attempt === SUPABASE_FETCH_RETRIES) {
        throw error;
      }
      await sleep(SUPABASE_FETCH_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Unknown fetch error'));
};

// Initialize database connection only if credentials are available
let supabaseAdminInstance: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      fetch: resilientSupabaseFetch,
    },
  });
}

// When credentials are missing, return an awaitable that resolves with empty/error so API routes don't throw
const supabaseNotInitializedError = new Error(
  'Supabase not initialized. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
);
const emptyResult = { data: [] as any[], error: null as Error | null };
const errorResult = { data: null as any, error: supabaseNotInitializedError };

function thenable(res: { data: any; error: Error | null } = emptyResult) {
  const p = Promise.resolve(res);
  return Object.assign(p, { then: p.then.bind(p), catch: p.catch.bind(p) });
}

function chainable() {
  const t = thenable(emptyResult);
  return {
    eq: () => chainable(),
    order: () => thenable(emptyResult),
    then: t.then.bind(t),
    catch: t.catch.bind(t),
  };
}

const mockClient = {
  from: () => ({
    select: () => ({
      eq: () => chainable(),
      order: () => thenable(emptyResult),
      single: () => Promise.resolve(errorResult),
      limit: () => Promise.resolve(emptyResult),
      then: thenable(emptyResult).then,
      catch: thenable(emptyResult).catch,
    }),
    insert: () => ({
      select: () => ({ single: () => Promise.resolve(errorResult) }),
    }),
    update: () => ({ eq: () => Promise.resolve(errorResult) }),
    delete: () => ({ eq: () => Promise.resolve(errorResult) }),
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
