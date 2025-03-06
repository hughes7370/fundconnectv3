-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table is automatically created by Supabase Auth

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  firm TEXT NOT NULL,
  broker_dealer_verified BOOLEAN DEFAULT FALSE
);

-- Investors table
CREATE TABLE IF NOT EXISTS investors (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  introducing_agent_id UUID REFERENCES agents(user_id),
  approved BOOLEAN DEFAULT FALSE
);

-- Funds table
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  size NUMERIC NOT NULL,
  minimum_investment NUMERIC NOT NULL,
  strategy TEXT NOT NULL,
  sector_focus TEXT NOT NULL,
  geography TEXT NOT NULL,
  track_record_irr NUMERIC,
  track_record_moic NUMERIC,
  team_background TEXT NOT NULL,
  management_fee NUMERIC NOT NULL,
  carry NUMERIC NOT NULL,
  uploaded_by_agent_id UUID NOT NULL REFERENCES agents(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund documents table
CREATE TABLE IF NOT EXISTS fund_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(user_id),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  agent_id UUID REFERENCES agents(user_id),
  UNIQUE(investor_id, fund_id)
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(user_id),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reported_by_agent_id UUID NOT NULL REFERENCES agents(user_id)
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(user_id),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('fund_intro', 'investor_intro')),
  amount NUMERIC NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  agent_id UUID NOT NULL REFERENCES agents(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(user_id),
  name TEXT NOT NULL,
  criteria JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alerts_enabled BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Agents RLS
CREATE POLICY "Agents can view their own data" ON agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all agents" ON agents
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Investors can view agent info" ON agents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM investors WHERE user_id = auth.uid() AND introducing_agent_id = agents.user_id
  ));

-- Investors RLS
CREATE POLICY "Investors can view their own data" ON investors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all investors" ON investors
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Agents can view their investors" ON investors
  FOR SELECT USING (introducing_agent_id = auth.uid());

-- Funds RLS
CREATE POLICY "Funds are viewable by authenticated users" ON funds
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can insert their own funds" ON funds
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by_agent_id);

CREATE POLICY "Agents can update their own funds" ON funds
  FOR UPDATE USING (auth.uid() = uploaded_by_agent_id);

CREATE POLICY "Agents can delete their own funds" ON funds
  FOR DELETE USING (auth.uid() = uploaded_by_agent_id);

-- Fund Documents RLS
CREATE POLICY "Fund documents are viewable by authenticated users" ON fund_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can insert documents for their own funds" ON fund_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM funds 
      WHERE id = fund_documents.fund_id AND uploaded_by_agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update documents for their own funds" ON fund_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM funds 
      WHERE id = fund_documents.fund_id AND uploaded_by_agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can delete documents for their own funds" ON fund_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM funds 
      WHERE id = fund_documents.fund_id AND uploaded_by_agent_id = auth.uid()
    )
  );

-- Interests RLS
CREATE POLICY "Investors can view their own interests" ON interests
  FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY "Agents can view interests in their funds" ON interests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM funds 
      WHERE id = interests.fund_id AND uploaded_by_agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all interests" ON interests
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Investors can insert their own interests" ON interests
  FOR INSERT WITH CHECK (investor_id = auth.uid());

CREATE POLICY "Investors can delete their own interests" ON interests
  FOR DELETE USING (investor_id = auth.uid());

-- Investments RLS
CREATE POLICY "Investors can view their own investments" ON investments
  FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY "Agents can view and insert investments for their funds" ON investments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM funds 
      WHERE id = investments.fund_id AND uploaded_by_agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all investments" ON investments
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Commissions RLS
CREATE POLICY "Agents can view their own commissions" ON commissions
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Admins can view all commissions" ON commissions
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Invitation Codes RLS
CREATE POLICY "Agents can view their own invitation codes" ON invitation_codes
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert their own invitation codes" ON invitation_codes
  FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own invitation codes" ON invitation_codes
  FOR DELETE USING (agent_id = auth.uid());

CREATE POLICY "Admins can view all invitation codes" ON invitation_codes
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Saved Searches RLS
CREATE POLICY "Investors can view their own saved searches" ON saved_searches
  FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY "Investors can insert their own saved searches" ON saved_searches
  FOR INSERT WITH CHECK (investor_id = auth.uid());

CREATE POLICY "Investors can update their own saved searches" ON saved_searches
  FOR UPDATE USING (investor_id = auth.uid());

CREATE POLICY "Investors can delete their own saved searches" ON saved_searches
  FOR DELETE USING (investor_id = auth.uid()); 