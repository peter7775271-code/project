# Supabase Migration Guide

Your authentication system has been successfully migrated from SQLite to Supabase! Here's what you need to do to get it working.

## ⚡ Quick Setup (2 minutes)

### 1. Get Your Supabase Credentials
- Go to [supabase.com](https://supabase.com) and sign in to your project
- Click **Settings** → **API** in the left sidebar
- Copy your **Project URL** and **Service Role Secret**

### 2. Add Credentials to `.env.local`
Update the placeholder values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Create the Users Table
Go to your Supabase project dashboard:

1. Click **SQL Editor** on the left sidebar
2. Click **New Query**
3. Paste this SQL and click **RUN**:

```sql
-- Drop existing table if it exists (optional, removes all data)
DROP TABLE IF EXISTS users CASCADE;

-- Create the users table
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

-- Create indexes for faster queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- For development: Allow all operations (⚠️ Don't use in production)
CREATE POLICY "Allow all operations" ON users
  FOR ALL USING (true) WITH CHECK (true);
```

### 4. Test Your Setup
```bash
npm run dev
```

Visit http://localhost:3000 and try signing up!

## 🐛 Troubleshooting

### Error: "invalid input syntax for type bigint"
**Cause**: The `verified` column was created as INTEGER instead of BOOLEAN
**Solution**: Drop and recreate the table using the SQL above

### Error: "relation 'users' does not exist"
**Cause**: The users table hasn't been created yet
**Solution**: Run the SQL from step 3 above

### Error: "new row violates row-level security policy"
**Cause**: RLS is enabled but policies don't allow inserts
**Solution**: Create the policy from step 3 or disable RLS temporarily

### Email not sending
**Cause**: Gmail credentials may be incorrect or app password not set up
**Solution**: 
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Create an App Password for Gmail
4. Update `EMAIL_PASS` in `.env.local`

## 📁 Files Modified

- `src/lib/db.ts` - Supabase initialization
- `src/lib/supbase.js` - Supabase client setup
- `src/lib/auth.ts` - All auth functions updated to use Supabase
- `src/app/api/auth/signup/route.ts` - Uses Supabase
- `src/app/api/auth/login/route.ts` - Uses Supabase
- `src/app/api/auth/verify/route.ts` - Uses Supabase
- `src/app/api/auth/forgot-password/route.ts` - Uses Supabase
- `src/app/api/auth/reset-password/route.tsx` - Uses Supabase
- `src/app/api/auth/resend-verification/route.ts` - Uses Supabase
- `.env.local` - Updated with Supabase credentials

## 🔑 Environment Variables Reference

| Variable | Example | Where to Find |
|----------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `sb_publishable_...` | Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Settings → API → service_role secret |

## 🔐 Production Security

For production deployments:

1. **Row Level Security (RLS)**: Create restrictive policies instead of allowing all operations
   ```sql
   -- Example: Only allow users to access their own data
   CREATE POLICY "Users can access their own data" ON users
     FOR SELECT USING (auth.uid() = id);
   ```

2. **Database Backups**: Enable automatic backups in Supabase settings

3. **API Key Rotation**: Regularly rotate your keys in Settings → API

4. **Disable Public Schema**: Consider using a separate schema for sensitive operations

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client Guide](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Managing Users](https://supabase.com/docs/guides/auth/managing-user-data)
