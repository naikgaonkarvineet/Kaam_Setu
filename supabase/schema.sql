-- ============================================================================
-- KAAMSETU COMPLETE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone_number text unique,
  email text unique,
  name text not null,
  role text not null check (role in ('worker', 'contractor', 'needs_workers')),
  location text,
  preferred_language text check (preferred_language in ('hindi', 'english')) default 'hindi',
  created_at timestamptz default now()
);

-- Migration for existing databases:
-- ALTER TABLE public.users ALTER COLUMN phone_number DROP NOT NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text unique;

-- 2. WORKER PROFILES TABLE
create table if not exists public.worker_profiles (
  id uuid primary key references public.users(id) on delete cascade,
  skills text[] default '{}',
  expertise text,
  work_experience text,
  spoken_languages text[] default '{}',
  rating_avg numeric default 0
);

-- 3. CONTRACTOR PROFILES TABLE
create table if not exists public.contractor_profiles (
  id uuid primary key references public.users(id) on delete cascade,
  company_name text,
  contact_details text
);

-- 4. JOBS TABLE
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.users(id) on delete set null,
  job_type text not null,
  location text not null,
  wage numeric not null,
  working_hours text,
  num_laborers_required integer default 1,
  required_skills text[] default '{}',
  is_urgent boolean default false,
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamptz default now()
);

-- 5. APPLICATIONS TABLE
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  worker_id uuid references public.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  applied_at timestamptz default now()
);

-- 6. REVIEWS TABLE
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.users(id) on delete cascade,
  reviewer_name text not null,
  rating numeric not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- 7. CREW TABLE (Contractor's Registered Workers & Wage Log)
create table if not exists public.crew (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.users(id) on delete cascade,
  worker_id uuid references public.users(id) on delete cascade,
  daily_wage_log jsonb default '[]'::jsonb,
  added_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all 7 tables
alter table public.users enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.contractor_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.reviews enable row level security;
alter table public.crew enable row level security;

-- USERS POLICIES
create policy "Users can read own row and public directory info"
  on public.users for select
  using (true);

create policy "Users can insert own record"
  on public.users for insert
  with check (auth.uid() = id or auth.uid() is null);

create policy "Users can update own record"
  on public.users for update
  using (auth.uid() = id);

-- WORKER PROFILES POLICIES
create policy "Authenticated users can browse worker profiles"
  on public.worker_profiles for select
  using (true);

create policy "Workers can insert their profile"
  on public.worker_profiles for insert
  with check (auth.uid() = id or auth.uid() is null);

create policy "Workers can update their own profile"
  on public.worker_profiles for update
  using (auth.uid() = id);

-- CONTRACTOR PROFILES POLICIES
create policy "Anyone can read contractor profile details"
  on public.contractor_profiles for select
  using (true);

create policy "Contractors can insert their profile"
  on public.contractor_profiles for insert
  with check (auth.uid() = id or auth.uid() is null);

create policy "Contractors can update their own profile"
  on public.contractor_profiles for update
  using (auth.uid() = id);

-- JOBS POLICIES
create policy "Any authenticated user can read active jobs"
  on public.jobs for select
  using (true);

create policy "Contractors can create jobs"
  on public.jobs for insert
  with check (auth.uid() = contractor_id or auth.uid() is null or contractor_id is null);

create policy "Only contractor who created job can update"
  on public.jobs for update
  using (auth.uid() = contractor_id or contractor_id is null);

create policy "Only contractor who created job can delete"
  on public.jobs for delete
  using (auth.uid() = contractor_id);

-- APPLICATIONS POLICIES
create policy "Workers and job contractors can view applications"
  on public.applications for select
  using (
    auth.uid() = worker_id
    or auth.uid() in (select contractor_id from public.jobs where public.jobs.id = applications.job_id)
    or auth.uid() is null
  );

create policy "Workers can submit applications"
  on public.applications for insert
  with check (auth.uid() = worker_id or auth.uid() is null);

create policy "Workers and contractors can update application status"
  on public.applications for update
  using (
    auth.uid() = worker_id
    or auth.uid() in (select contractor_id from public.jobs where public.jobs.id = applications.job_id)
  );

-- REVIEWS POLICIES
create policy "Any authenticated user can read reviews"
  on public.reviews for select
  using (true);

create policy "Authenticated users can submit reviews"
  on public.reviews for insert
  with check (true);

-- CREW POLICIES
create policy "Contractors can view their own crew"
  on public.crew for select
  using (auth.uid() = contractor_id or auth.uid() is null);

create policy "Contractors can add workers to crew"
  on public.crew for insert
  with check (auth.uid() = contractor_id or auth.uid() is null);

create policy "Contractors can update their crew wage logs"
  on public.crew for update
  using (auth.uid() = contractor_id or auth.uid() is null);

create policy "Contractors can delete crew members"
  on public.crew for delete
  using (auth.uid() = contractor_id);

-- ============================================================================
-- SEED DATA (For instant development & testing)
-- ============================================================================

-- Seed Users
insert into public.users (id, phone_number, name, role, location, preferred_language)
values
  ('11111111-1111-1111-1111-111111111101', '9876543210', 'Raju Kumar', 'worker', 'Andheri West, Mumbai', 'hindi'),
  ('11111111-1111-1111-1111-111111111102', '9820154321', 'Shiv Kumar Sharma', 'contractor', 'Andheri West, Mumbai', 'hindi'),
  ('11111111-1111-1111-1111-111111111103', '9819000111', 'Anil Deshmukh', 'needs_workers', 'Bandra Kurla Complex, Mumbai', 'english'),
  ('11111111-1111-1111-1111-111111111104', '9833411223', 'Dinesh Yadav', 'worker', 'Borivali East, Mumbai', 'hindi'),
  ('11111111-1111-1111-1111-111111111105', '9821099887', 'Suresh Patil', 'worker', 'Thane West, Mumbai', 'hindi')
on conflict (phone_number) do nothing;

-- Seed Worker Profiles
insert into public.worker_profiles (id, skills, expertise, work_experience, spoken_languages, rating_avg)
values
  ('11111111-1111-1111-1111-111111111101', array['Brickwork', 'Plastering', 'Tile Base', 'RCC Layout'], 'masonry', '5 Years Experience', array['Hindi', 'Marathi', 'Bhojpuri'], 4.9),
  ('11111111-1111-1111-1111-111111111104', array['Emulsion Paint', 'Putty Finishing', 'Waterproofing'], 'painting', '4 Years Experience', array['Hindi', 'Bhojpuri'], 4.8),
  ('11111111-1111-1111-1111-111111111105', array['Modular Kitchen', 'Door Fitting', 'Sunmica Laminate'], 'carpentry', '7 Years Experience', array['Marathi', 'Hindi', 'English'], 5.0)
on conflict (id) do nothing;

-- Seed Contractor Profiles
insert into public.contractor_profiles (id, company_name, contact_details)
values
  ('11111111-1111-1111-1111-111111111102', 'Shiv Builders & Infrastructure', '+91 98201 54321 · shivbuilders@kaamsetu.in')
on conflict (id) do nothing;

-- Seed Jobs
insert into public.jobs (id, contractor_id, job_type, location, wage, working_hours, num_laborers_required, required_skills, is_urgent, status)
values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102', 'masonry', 'Andheri West, Mumbai', 850, '8:30 AM – 5:30 PM (8 hrs)', 3, array['Bricklaying', 'Plastering'], true, 'active'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'painting', 'Wakad, Pune', 750, '9:00 AM – 6:00 PM (8 hrs)', 2, array['Wall Putty', 'Exterior Painting'], false, 'active'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102', 'electrician', 'Bandra Kurla Complex, Mumbai', 900, '8:00 AM – 5:00 PM (8 hrs)', 2, array['Conduit Wiring', 'MCB Setup'], true, 'active'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102', 'plumbing', 'Thane West, Mumbai', 820, '8:30 AM – 5:30 PM (8 hrs)', 1, array['CPVC Pipe Fitting', 'Drainage'], false, 'active')
on conflict (id) do nothing;

-- Seed Applications
insert into public.applications (id, job_id, worker_id, status)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'pending'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111104', 'pending')
on conflict (id) do nothing;

-- Seed Reviews
insert into public.reviews (id, worker_id, reviewer_name, rating, comment)
values
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101', 'Shiv Kumar Sharma (Contractor)', 5.0, 'Exceptional craftsmanship and strictly punctual. Finished the wall alignment ahead of schedule.'),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111101', 'Rajesh Wagh (Omkar Heights)', 4.8, 'Worked with my crew for 6 days. Zero wastage of cement and very cooperative.'),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111104', 'Anil Deshmukh (Skyline Homes)', 4.8, 'Neat painting job, timely completion, and fair rates.')
on conflict (id) do nothing;

-- Seed Crew
insert into public.crew (id, contractor_id, worker_id, daily_wage_log)
values
  ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111101', '[{"date":"2026-09-10","wage":850,"present":true},{"date":"2026-09-11","wage":850,"present":true}]'::jsonb),
  ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111104', '[{"date":"2026-09-11","wage":750,"present":true}]'::jsonb)
on conflict (id) do nothing;
