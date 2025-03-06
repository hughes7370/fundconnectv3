-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID REFERENCES auth.users(id) NOT NULL,
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  investor_last_read TIMESTAMP,
  agent_last_read TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_investor_id ON conversations(investor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- RLS Policies for Conversations table
CREATE POLICY "Users can view their conversations" ON conversations
FOR SELECT TO authenticated
USING (investor_id = auth.uid() OR agent_id = auth.uid());

CREATE POLICY "Users can create conversations" ON conversations
FOR INSERT TO authenticated
WITH CHECK (
  (investor_id = auth.uid()) OR
  (agent_id = auth.uid())
);

CREATE POLICY "Users can update their read status" ON conversations
FOR UPDATE TO authenticated
USING (investor_id = auth.uid() OR agent_id = auth.uid())
WITH CHECK (investor_id = auth.uid() OR agent_id = auth.uid());

-- RLS Policies for Messages table
CREATE POLICY "Users can view messages in their conversations" ON messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (investor_id = auth.uid() OR agent_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations" ON messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (investor_id = auth.uid() OR agent_id = auth.uid())
  )
);

-- Create the RPC function to get conversations for a user
CREATE OR REPLACE FUNCTION get_conversations_for_user()
RETURNS TABLE (
  id UUID,
  other_participant_name TEXT,
  last_message TEXT,
  last_message_timestamp TIMESTAMP,
  unread_count BIGINT
) AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine if the user is an investor or agent
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM investors WHERE user_id = auth.uid()) THEN 'investor'
      WHEN EXISTS (SELECT 1 FROM agents WHERE user_id = auth.uid()) THEN 'agent'
    END INTO user_role;

  RETURN QUERY
  SELECT 
    c.id,
    CASE 
      WHEN user_role = 'investor' THEN a.name
      WHEN user_role = 'agent' THEN i.name
      ELSE 'Unknown'
    END,
    (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1),
    (SELECT timestamp FROM messages m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1),
    (SELECT COUNT(*) FROM messages m 
     WHERE m.conversation_id = c.id 
       AND m.sender_id != auth.uid() 
       AND m.timestamp > COALESCE(
         CASE 
           WHEN user_role = 'investor' THEN c.investor_last_read
           WHEN user_role = 'agent' THEN c.agent_last_read
           ELSE '1970-01-01'
         END, '1970-01-01')
    )
  FROM conversations c
  LEFT JOIN investors i ON c.investor_id = i.user_id
  LEFT JOIN agents a ON c.agent_id = a.user_id
  WHERE 
    (user_role = 'investor' AND c.investor_id = auth.uid()) OR
    (user_role = 'agent' AND c.agent_id = auth.uid())
  ORDER BY (SELECT MAX(timestamp) FROM messages m WHERE m.conversation_id = c.id) DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 