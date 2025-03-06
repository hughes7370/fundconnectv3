const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240805000000_fund_profiles.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    
    // Execute the SQL directly using the rpc function
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSql
    });

    if (error) {
      console.error('Error executing migration:', error);
      process.exit(1);
    }

    console.log('Migration executed successfully!');
    console.log('Result:', data);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration(); 