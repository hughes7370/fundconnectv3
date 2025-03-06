import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  console.log(`Fetching conversation with ID: ${id}`);

  try {
    // First try to get the conversation using a direct query
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ error: 'Error fetching conversation', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    console.log("Conversation found:", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: 'Unexpected error', details: error.message });
  }
} 