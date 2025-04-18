# Fund Connect

Fund Connect is a platform that connects fund placement agents with investors (LPs) to streamline the deal-sharing process, replacing manual database filtering and overwhelming email communications.

## Features

- **Agents**: Upload deals via a simple web form, introduce investors, and earn commissions on capital raised or investor interest.
- **Investors**: Register via agent referral (or request access), filter deals using Pitchbook-style tools, review fund details, express interest, and set alerts for matching funds.
- **Administrators**: Approve investor requests, manage users, and monitor platform activity.

## Tech Stack

- **Frontend**: Next.js (React), Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Real-time features)
- **Hosting**: Vercel

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Git
- Supabase account

### Local Development Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd fundconnect
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up Supabase**

- Create a new Supabase project at [supabase.com](https://supabase.com)
- Create the database tables as specified in the schema below
- Enable auth providers (email/password)
- Set up storage buckets for documents
- Configure Row Level Security (RLS) policies

4. **Configure environment variables**

Create a `.env.local` file in the project root with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

5. **Run the development server**

```bash
npm run dev
# or
yarn dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### Database Schema Setup

Execute the following SQL in your Supabase SQL editor to set up the required tables:

```sql
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
```

### Setting up Row Level Security

Add RLS policies to secure your database:

```sql
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

-- Investors RLS
CREATE POLICY "Investors can view their own data" ON investors
  FOR SELECT USING (auth.uid() = user_id);

-- Funds RLS
CREATE POLICY "Funds are viewable by authenticated users" ON funds
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can insert their own funds" ON funds
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by_agent_id);

CREATE POLICY "Agents can update their own funds" ON funds
  FOR UPDATE USING (auth.uid() = uploaded_by_agent_id);

CREATE POLICY "Agents can delete their own funds" ON funds
  FOR DELETE USING (auth.uid() = uploaded_by_agent_id);

-- Similar policies for other tables...
```

### Setting up Storage Buckets

1. Create a `fund-documents` bucket in Supabase Storage
2. Configure RLS policies for the bucket

## Deployment

### Vercel Deployment

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
