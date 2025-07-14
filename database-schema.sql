-- Create reports table
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);

-- Enable Row Level Security (RLS)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access" ON reports
  FOR SELECT USING (status = 'active');

-- Create policies for authenticated users to insert/update
CREATE POLICY "Allow authenticated users to insert" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow authenticated users to update" ON reports
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create policy for service role to update any report (for voting)
CREATE POLICY "Allow service role to update" ON reports
  FOR UPDATE USING (true);

-- Function to automatically set expires_at for upvoted reports (48 hours)
CREATE OR REPLACE FUNCTION set_expires_at_on_upvote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.upvotes > OLD.upvotes THEN
    NEW.expires_at = NOW() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function when upvotes change
CREATE TRIGGER trigger_set_expires_at_on_upvote
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION set_expires_at_on_upvote();

-- Function to automatically remove reports with 3+ downvotes
CREATE OR REPLACE FUNCTION remove_reports_with_downvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.downvotes >= 3 THEN
    NEW.status = 'removed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function when downvotes change
CREATE TRIGGER trigger_remove_reports_with_downvotes
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION remove_reports_with_downvotes(); 