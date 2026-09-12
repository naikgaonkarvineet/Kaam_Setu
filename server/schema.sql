create table public.users (id uuid primary key, name text not null, role text not null check (role in ('worker','contractor','employer')), phone text, city text, skill text, reliability_score numeric default 0, business_name text);
create table public.contractor_workers (id uuid primary key default gen_random_uuid(), contractor_id uuid references public.users(id), worker_name text not null, skill text);
create table public.jobs (id uuid primary key default gen_random_uuid(), employer_id uuid references public.users(id), skill text not null, wage_offered numeric not null, location text not null, status text default 'open' check (status in ('open','accepted','completed')), applicant_id uuid references public.users(id), created_at timestamptz default now());
create table public.wage_entries (id uuid primary key default gen_random_uuid(), skill text not null, city text not null, area text, rate numeric not null, source text check (source in ('worker','contractor')), date date default current_date);
create table public.reference_rates (skill text not null, state text not null, min_wage numeric not null, primary key (skill, state));
alter table public.users enable row level security; alter table public.jobs enable row level security; alter table public.wage_entries enable row level security;
create policy "लोग अपना काम देखें" on public.jobs for select using (auth.uid() = employer_id or auth.uid() = applicant_id or status = 'open');
create policy "काम देने वाला अपना काम लिखे" on public.jobs for insert with check (auth.uid() = employer_id);
