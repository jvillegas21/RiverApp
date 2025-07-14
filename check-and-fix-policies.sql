-- First, let's see what policies currently exist on the reports table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'reports';

-- Drop all existing update policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to update" ON reports;
DROP POLICY IF EXISTS "Allow updates for anonymous reports" ON reports;
DROP POLICY IF EXISTS "Allow authenticated users to update own reports" ON reports;
DROP POLICY IF EXISTS "Allow service role to update" ON reports;

-- Create a simple policy that allows all updates (for now, to test)
CREATE POLICY "Allow all updates" ON reports
  FOR UPDATE USING (true);

-- Also create a policy for inserts
CREATE POLICY "Allow all inserts" ON reports
  FOR INSERT WITH CHECK (true);

-- Keep the existing read policy
-- CREATE POLICY "Allow public read access" ON reports
--   FOR SELECT USING (status = 'active'); 