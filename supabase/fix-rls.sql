-- Add INSERT policy for agents table
CREATE POLICY "Users can insert their own agent profile" ON agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for agents table
CREATE POLICY "Agents can update their own data" ON agents
  FOR UPDATE USING (auth.uid() = user_id);

-- Add similar policies for investors table if needed
CREATE POLICY "Users can insert their own investor profile" ON investors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Investors can update their own data" ON investors
  FOR UPDATE USING (auth.uid() = user_id); 