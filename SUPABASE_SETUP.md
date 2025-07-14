# Supabase Setup Guide for RiverApp

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `riverapp-reports` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose closest to your users
5. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)
   - **service_role** key (starts with `eyJ`) - Keep this secret!

## Step 3: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `database-schema.sql` from this project
3. Click "Run" to create the table and triggers

## Step 4: Configure Environment Variables

### For Local Development (frontend/.env.local):
```
REACT_APP_SUPABASE_URL=your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### For Netlify Deployment:
1. Go to your Netlify dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these variables:
   - `SUPABASE_URL` = your_project_url_here
   - `SUPABASE_SERVICE_ROLE_KEY` = your_service_role_key_here

## Step 5: Test the Integration

1. Deploy your app to Netlify
2. Try submitting a report
3. Check your Supabase dashboard → **Table Editor** → **reports** to see the data

## Security Notes

- The `service_role` key has admin privileges - only use it in server-side code (Netlify Functions)
- The `anon` key is safe for client-side use
- Row Level Security (RLS) is enabled on the reports table
- Users can only read active reports and create new ones

## Database Features

- **Automatic expiration**: Reports with upvotes get 48-hour expiration
- **Auto-removal**: Reports with 3+ downvotes are automatically marked as removed
- **Indexing**: Optimized queries for recent reports and categories
- **Audit trail**: All reports have timestamps and user tracking

## Troubleshooting

- If reports aren't saving, check your Netlify function logs
- If you can't see reports, verify RLS policies are correct
- If environment variables aren't working, restart your Netlify functions 