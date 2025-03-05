Product Briefing: Fund Connect Platform

#### Product Overview
**Fund Connect** is a platform that connects fund placement agents with investors (LPs) to streamline the deal-sharing process, replacing manual database filtering and overwhelming email communications. Agents can upload deals via a simple web form, introduce investors, and earn commissions on capital raised or investor interest. Investors can register via agent referral (or request access), filter deals using Pitchbook-style tools, review fund details, express interest, and set alerts for matching funds. The platform aims to enhance efficiency, improve deal-investor matching, and provide transparent commission tracking.

---

#### User Roles and Permissions
- **Fund Placement Agents**
  - Register independently with broker-dealer verification.
  - Upload deals and manage documents.
  - Introduce investors (assigned to them) and track commissions.
- **Investors (LPs)**
  - Register via agent invitation code or approved request form.
  - Search, filter, and review funds; express interest; set alerts.
- **Admins**
  - Approve investor requests, manage users, monitor platform activity.

---

#### MVP Feature List
The Minimum Viable Product (MVP) focuses on core functionality to address primary pain points, with a scalable foundation for future enhancements.

1. **User Registration & Authentication**
   - Agent self-registration with email verification and broker-dealer check.
   - Investor registration via agent-provided invitation code or admin-approved request form.
   - Role-based access control (agents, investors, admins).

2. **Deal Management for Agents**
   - **Deal Upload Form**: Simple web form with fields:
     - Fund name, size, minimum investment.
     - Strategy, sector focus, geography.
     - Track record (IRR, MOIC), team background, key terms (fees, carry).
     - Document uploads (e.g., PPM, pitch deck, Excel).
   - **Investor Assignment**: Interface to invite and assign investors to the agent.
   - **Dashboard**: View uploaded deals, investor engagement, and commission status.

3. **Deal Discovery for Investors**
   - **Filtering Tools**: Search and filter by:
     - Fund size, strategy, geography, minimum investment, performance metrics.
   - **Saved Search Profiles**: Store criteria for recurring use.
   - **Alerts**: Email or in-platform notifications for new matching funds.
   - **Fund Profile**: Detailed view with documents and interest submission button.

4. **Document Management**
   - Secure uploads via Supabase Storage.
   - Access tracking (who viewed what, when).
   - Version control for updates.

5. **Commission Attribution**
   - Track fund introductions (agent who uploaded earns commission on capital raised).
   - Track investor introductions (agent earns commission on interest or investment).
   - Rules for split commissions when different agents introduce fund and investor.
   - Manual input for investment amounts (for MVP simplicity).

6. **Communication Tools**
   - In-platform messaging between agents and investors.
   - Interest indication notifies relevant agents.
   - Basic meeting scheduler.

7. **Analytics Dashboard**
   - **Agents**: Deal views, investor activity, commission totals.
   - **Investors**: Deal flow overview, interest history.
   - **Admins**: User stats, commission distributions.

---

#### Database Schema (Supabase)
Using Supabase’s PostgreSQL database, the schema supports the MVP features:

- **users**
  - `id` (UUID, primary key)
  - `email` (text, unique)
  - `password` (text, hashed)
  - `role` (enum: ‘agent’, ‘investor’, ‘admin’)
  - `created_at` (timestamp)

- **agents**
  - `user_id` (UUID, foreign key to `users`)
  - `name` (text)
  - `firm` (text)
  - `broker_dealer_verified` (boolean)

- **investors**
  - `user_id` (UUID, foreign key to `users`)
  - `name` (text)
  - `introducing_agent_id` (UUID, foreign key to `agents.user_id`)
  - `approved` (boolean, default false)

- **funds**
  - `id` (UUID, primary key)
  - `name` (text)
  - `size` (numeric)
  - `minimum_investment` (numeric)
  - `strategy` (text)
  - `sector_focus` (text)
  - `geography` (text)
  - `track_record_irr` (numeric)
  - `track_record_moic` (numeric)
  - `team_background` (text)
  - `management_fee` (numeric)
  - `carry` (numeric)
  - `uploaded_by_agent_id` (UUID, foreign key to `agents.user_id`)
  - `created_at` (timestamp)

- **fund_documents**
  - `id` (UUID, primary key)
  - `fund_id` (UUID, foreign key to `funds`)
  - `document_type` (text, e.g., ‘PPM’, ‘pitch_deck’)
  - `file_url` (text, Supabase Storage URL)
  - `uploaded_at` (timestamp)

- **interests**
  - `id` (UUID, primary key)
  - `investor_id` (UUID, foreign key to `investors.user_id`)
  - `fund_id` (UUID, foreign key to `funds`)
  - `timestamp` (timestamp)

- **investments** *(for commission tracking)*
  - `id` (UUID, primary key)
  - `investor_id` (UUID, foreign key to `investors.user_id`)
  - `fund_id` (UUID, foreign key to `funds`)
  - `amount` (numeric)
  - `date` (timestamp)
  - `reported_by_agent_id` (UUID, foreign key to `agents.user_id`)

- **commissions** *(calculated or stored)*
  - `id` (UUID, primary key)
  - `agent_id` (UUID, foreign key to `agents.user_id`)
  - `investment_id` (UUID, foreign key to `investments`)
  - `commission_type` (enum: ‘fund_intro’, ‘investor_intro’)
  - `amount` (numeric)
  - `calculated_at` (timestamp)

**Notes**: 
- Row-level security (RLS) will restrict access (e.g., agents see only their funds/investors).
- Commissions may be calculated dynamically in the app rather than stored, depending on complexity.

---

#### User Flows
1. **Agent Uploads a Deal**
   - Login → “Upload Deal” → Fill form (fund details + documents) → Submit → Fund visible to investors.
2. **Investor Searches for Funds**
   - Login → “Find Funds” → Apply filters → View results → Click fund → Review details → Express interest.
3. **Commission Tracking**
   - Investor expresses interest → Agent notified → Investment made (agent reports amount) → Commissions attributed to fund and investor introducers.

---

#### Technical Stack
- **Frontend**: Next.js (React framework for server-side rendering and static sites)
- **Backend**: Supabase (PostgreSQL database, authentication, storage, real-time features)
- **Hosting**: Vercel (frontend hosting, serverless functions if needed)
- **Storage**: Supabase Storage for secure document hosting

---

#### API Endpoints (Supabase Client-Side Calls)
Supabase handles most CRUD operations via its client library. Key interactions:
- **Auth**: `supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`
- **Deals**: `supabase.from('funds').insert({...})`, `supabase.from('funds').select('*')`
- **Documents**: `supabase.storage.from('fund-docs').upload()`, `.getPublicUrl()`
- **Interests**: `supabase.from('interests').insert({...})`
- **Real-time**: `supabase.channel('interests').on('INSERT', ...)` for alerts

Custom logic (e.g., commission calculation) can use Vercel serverless functions if beyond Supabase’s edge functions.

---

#### Deployment Plan
1. **Setup**:
   - Initialize Supabase project, define schema, enable RLS.
   - Create Next.js app, integrate Supabase SDK.
2. **Development**:
   - Build frontend components (forms, dashboards, filters).
   - Implement authentication and CRUD operations.
   - Test document uploads and access controls.
3. **CI/CD**:
   - Vercel Git integration for automatic builds and deploys.
   - Supabase CLI for database migrations.
4. **Security**:
   - Enable RLS policies (e.g., `select` only for authenticated users).
   - Use environment variables for API keys.

---

#### Key Considerations
- **Security**: Encrypt sensitive data, comply with FINRA/SEC via disclaimers and audit trails.
- **UX Priorities**: Minimize agent data entry, intuitive investor filters, clear commission visibility.
- **Challenges**: Accurate commission splits, compliance enforcement, scalable filtering.

---

#### Success Metrics
- **Agent Adoption**: 50+ agents in Q1.
- **Deal Volume**: 100+ funds uploaded in 3 months.
- **Investor Engagement**: 25%+ interest rate on alerts.
- **Efficiency**: 50% reduction in manual filtering time.
- **Match Rate**: 60%+ deals matching investor criteria.

---

This briefing provides the development team with a clear roadmap to build the Fund Connect MVP using Supabase and Vercel, addressing the core needs of fund placement agents and investors while setting the stage for future growth. Let me know if you’d like deeper details on any section!