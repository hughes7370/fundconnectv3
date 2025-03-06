# SQL Functions for Role Management

This directory contains SQL functions that help with role management in the FundConnect application.

## Setup Instructions

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `create_role_functions.sql` and paste it into the SQL Editor
4. Run the SQL script to create the functions

## Available Functions

### `is_agent(user_id_param UUID)`
Checks if a user is an agent.

### `is_investor(user_id_param UUID)`
Checks if a user is an investor.

### `get_all_agents()`
Returns all agents in the database.

### `get_all_investors()`
Returns all investors in the database.

### `get_user_role(user_id_param UUID)`
Returns a JSON object with information about a user's roles.

## Why These Functions?

These functions are created with `SECURITY DEFINER` which means they run with the permissions of the function creator (typically the database owner). This allows them to bypass Row Level Security (RLS) policies, which is useful for administrative operations or when you need to access data across different security contexts.

By using these functions, the application can reliably check user roles and fetch role-related data without being restricted by RLS policies.

## Troubleshooting

If you encounter errors when calling these functions:

1. Make sure the functions are created correctly in your database
2. Check that the user executing the functions has the necessary permissions
3. Verify that the tables referenced in the functions (`agents` and `investors`) exist and have the expected structure

If you need to modify these functions, you can edit the SQL script and run it again in the SQL Editor. 