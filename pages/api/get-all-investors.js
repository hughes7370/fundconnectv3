import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Fetching all investors using get_all_investors function");
    
    // Use the get_all_investors function
    const { data, error } = await supabase.rpc('get_all_investors');
    
    if (error) {
      console.error("Error calling get_all_investors:", error);
      
      // Fallback to direct query
      try {
        console.log("Falling back to direct query");
        const { data: directData, error: directError } = await supabase
          .from('investors')
          .select('*');
        
        if (directError) {
          console.error("Error with direct query:", directError);
          return res.status(500).json({ 
            error: 'Error fetching investors', 
            details: directError.message
          });
        }
        
        return res.status(200).json(directData || []);
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        return res.status(500).json({ 
          error: 'Error fetching investors', 
          details: fallbackError.message
        });
      }
    }
    
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Unexpected error', details: error.message });
  }
} 