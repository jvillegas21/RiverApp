-- Drop the current update policy
DROP POLICY IF EXISTS "Allow all updates" ON reports;

-- Create a policy that allows updates regardless of status changes
CREATE POLICY "Allow all updates" ON reports
  FOR UPDATE USING (true);

-- Also ensure we have a policy that allows reading both active and removed reports
-- (for the API to work properly)
DROP POLICY IF EXISTS "Allow public read access" ON reports;

CREATE POLICY "Allow public read access" ON reports
  FOR SELECT USING (true); 