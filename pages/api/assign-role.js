import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Received role assignment request:", JSON.stringify(req.body));
    
    const { userId, role } = req.body;

    if (!userId) {
      console.error("Missing userId in request");
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!role || (role !== 'agent' && role !== 'investor')) {
      console.error(`Invalid role: ${role}`);
      return res.status(400).json({ error: 'Valid role (agent or investor) is required' });
    }

    console.log(`Assigning role ${role} to user ID: ${userId}`);

    // Check if user already has this role using direct SQL
    const tableName = role === 'agent' ? 'agents' : 'investors';
    
    // Check if record exists
    const { data: existingData, error: existingError } = await supabase
      .rpc('check_user_role', { 
        user_id_param: userId, 
        table_name_param: tableName 
      });

    if (existingError) {
      console.error(`Error checking existing ${role} role:`, existingError);
      
      // If the RPC function doesn't exist, we'll try a direct query
      const { data: directData, error: directError } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId);
        
      if (directError) {
        console.error(`Error with direct query:`, directError);
        return res.status(500).json({ 
          error: `Error checking existing ${role} role`, 
          details: existingError.message 
        });
      }
      
      if (directData && directData.length > 0) {
        console.log(`User already has ${role} role:`, directData[0]);
        return res.status(200).json({ 
          success: true, 
          message: `User already has ${role} role`,
          data: directData[0]
        });
      }
    } else if (existingData && existingData.exists) {
      console.log(`User already has ${role} role`);
      return res.status(200).json({ 
        success: true, 
        message: `User already has ${role} role`
      });
    }

    // Insert record using direct SQL
    let result;
    
    if (role === 'agent') {
      const insertData = {
        user_id: userId,
        name: 'New Agent',
        firm: 'Your Company'
      };
      
      console.log("Creating agent record with data:", insertData);
      
      // Try direct insert first
      const { data, error } = await supabase
        .from('agents')
        .insert([insertData])
        .select();
        
      if (error) {
        console.error('Error with direct insert:', error);
        
        // If direct insert fails, try using RPC
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('insert_agent', { 
            user_id_param: userId,
            name_param: 'New Agent',
            firm_param: 'Your Company'
          });
          
        if (rpcError) {
          console.error('Error with RPC insert:', rpcError);
          
          // As a last resort, suggest SQL to run manually
          const sqlCommand = `
            INSERT INTO agents (user_id, name, firm)
            VALUES ('${userId}', 'New Agent', 'Your Company');
          `;
          
          console.log('Manual SQL command to run:', sqlCommand);
          
          return res.status(500).json({ 
            error: 'Error assigning agent role', 
            details: error.message,
            sqlCommand
          });
        }
        
        console.log("Agent record created via RPC:", rpcData);
        result = { success: true };
      } else {
        console.log("Agent record created:", data);
        result = data;
      }
    } else {
      const insertData = {
        user_id: userId,
        name: 'New Investor',
        approved: true
      };
      
      console.log("Creating investor record with data:", insertData);
      
      // Try direct insert first
      const { data, error } = await supabase
        .from('investors')
        .insert([insertData])
        .select();
        
      if (error) {
        console.error('Error with direct insert:', error);
        
        // If direct insert fails, try using RPC
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('insert_investor', { 
            user_id_param: userId,
            name_param: 'New Investor',
            approved_param: true
          });
          
        if (rpcError) {
          console.error('Error with RPC insert:', rpcError);
          
          // As a last resort, suggest SQL to run manually
          const sqlCommand = `
            INSERT INTO investors (user_id, name, approved)
            VALUES ('${userId}', 'New Investor', true);
          `;
          
          console.log('Manual SQL command to run:', sqlCommand);
          
          return res.status(500).json({ 
            error: 'Error assigning investor role', 
            details: error.message,
            sqlCommand
          });
        }
        
        console.log("Investor record created via RPC:", rpcData);
        result = { success: true };
      } else {
        console.log("Investor record created:", data);
        result = data;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully assigned ${role} role to user`,
      data: result
    });
  } catch (error) {
    console.error('Unexpected error in assign-role API:', error);
    return res.status(500).json({ error: 'Unexpected error', details: error.message });
  }
} 