-- Fix RLS policy to allow updates for reports with user_id IS NULL
-- This allows voting on reports that don't have a specific user owner

-- Drop the existing update policy
DROP POLICY IF EXISTS "Allow authenticated users to update" ON reports;

-- Create a new policy that allows updates for reports with user_id IS NULL
CREATE POLICY "Allow updates for anonymous reports" ON reports
  FOR UPDATE USING (user_id IS NULL);

-- Also allow updates for authenticated users on their own reports
CREATE POLICY "Allow authenticated users to update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id); 