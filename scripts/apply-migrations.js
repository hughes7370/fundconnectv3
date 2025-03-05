#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'ignore' });
} catch (error) {
  console.error('Supabase CLI is not installed. Please install it first:');
  console.error('npm install -g supabase');
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to apply migrations
async function applyMigrations() {
  try {
    console.log('Applying migrations to Supabase project...');
    
    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      console.error('.env.local file not found. Please ensure it exists with your Supabase credentials.');
      process.exit(1);
    }
    
    // Read Supabase URL and key from .env.local
    const envContent = fs.readFileSync(envPath, 'utf8');
    const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
    const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or key not found in .env.local file.');
      process.exit(1);
    }
    
    // Ask for confirmation
    rl.question(`Are you sure you want to apply migrations to ${supabaseUrl}? (y/n) `, (answer) => {
      if (answer.toLowerCase() !== 'y') {
        console.log('Migration cancelled.');
        rl.close();
        return;
      }
      
      // Ask for service role key for admin operations
      rl.question('Please enter your Supabase service_role key for admin operations (or press Enter to use anon key with limited functionality): ', (serviceKey) => {
        // Use service role key if provided, otherwise fall back to anon key
        const apiKey = serviceKey.trim() || supabaseKey;
        
        // Apply migrations using Supabase REST API
        try {
          console.log('Applying storage policies migration...');
          
          // Execute the SQL file directly using the Supabase REST API
          const migrationPath = path.join(process.cwd(), 'supabase/migrations/20240801000000_storage_policies.sql');
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
          
          // Create a temporary file with the curl command
          const tempScriptPath = path.join(process.cwd(), 'temp-migration.sh');
          const curlCommand = `
#!/bin/bash
curl -X POST '${supabaseUrl}/rest/v1/rpc/exec_sql' \\
  -H 'apikey: ${apiKey}' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{"query": ${JSON.stringify(migrationSQL)}}'
`;
          
          fs.writeFileSync(tempScriptPath, curlCommand);
          fs.chmodSync(tempScriptPath, '755');
          
          // Execute the curl command
          execSync(tempScriptPath, { stdio: 'inherit' });
          
          // Clean up
          fs.unlinkSync(tempScriptPath);
          
          console.log('\nMigration applied successfully!');
          console.log('Please restart your application to see the changes.');
          
          // Provide instructions for manual setup if using anon key
          if (!serviceKey.trim()) {
            console.log('\nNote: You used the anon key which may have limited permissions.');
            console.log('If you encounter errors, please follow the manual setup instructions in STORAGE_SETUP.md');
          }
        } catch (error) {
          console.error('Error applying migrations:', error.message);
          console.error('\nYou may need to apply the migrations manually using the Supabase dashboard.');
          console.error('Please follow the instructions in STORAGE_SETUP.md for manual setup.');
        }
        
        rl.close();
      });
    });
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the migration function
applyMigrations(); 