// Script to check investor data in Supabase
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// The investor ID to check
const investorId = '00d980f5-5dcf-47e6-b2df-36a24f4b9f47';

async function checkInvestor() {
  console.log(`Checking investor with ID: ${investorId}`);
  
  // Check auth.users table
  console.log('\nChecking auth.users table...');
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(investorId);
  
  if (userError) {
    console.error('Error fetching from auth.users:', userError);
  } else if (userData && userData.user) {
    console.log('User found in auth.users:', {
      id: userData.user.id,
      email: userData.user.email,
      role: userData.user.user_metadata?.role,
      created_at: userData.user.created_at
    });
  } else {
    console.log('User not found in auth.users');
  }
  
  // Check investors table
  console.log('\nChecking investors table...');
  const { data: investorData, error: investorError } = await supabase
    .from('investors')
    .select('*')
    .eq('user_id', investorId);
    
  if (investorError) {
    console.error('Error fetching from investors:', investorError);
  } else if (investorData && investorData.length > 0) {
    console.log('Investor found in investors table:', investorData[0]);
  } else {
    console.log('Investor not found in investors table');
  }
  
  // Check interests table
  console.log('\nChecking interests table...');
  const { data: interestsData, error: interestsError } = await supabase
    .from('interests')
    .select('*')
    .eq('investor_id', investorId);
    
  if (interestsError) {
    console.error('Error fetching from interests:', interestsError);
  } else if (interestsData && interestsData.length > 0) {
    console.log(`Found ${interestsData.length} interests for this investor`);
    console.log('First interest:', interestsData[0]);
  } else {
    console.log('No interests found for this investor');
  }
  
  // Check if this ID is an interest ID
  console.log('\nChecking if this is an interest ID...');
  const { data: interestData, error: interestError } = await supabase
    .from('interests')
    .select('*')
    .eq('id', investorId);
    
  if (interestError) {
    console.error('Error checking if ID is an interest:', interestError);
  } else if (interestData && interestData.length > 0) {
    console.log('This ID is an interest ID:', interestData[0]);
    
    // Check the actual investor
    const actualInvestorId = interestData[0].investor_id;
    console.log(`\nChecking actual investor with ID: ${actualInvestorId}`);
    
    const { data: actualInvestor, error: actualInvestorError } = await supabase
      .from('investors')
      .select('*')
      .eq('user_id', actualInvestorId);
      
    if (actualInvestorError) {
      console.error('Error fetching actual investor:', actualInvestorError);
    } else if (actualInvestor && actualInvestor.length > 0) {
      console.log('Actual investor found:', actualInvestor[0]);
    } else {
      console.log('Actual investor not found');
    }
  } else {
    console.log('This ID is not an interest ID');
  }
}

checkInvestor()
  .catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
  }); 