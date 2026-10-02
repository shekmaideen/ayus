create type public.app_role as enum ('doctor', 'receptionist');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "staff read roles" on public.user_roles for select to authenticated using (public.is_staff(auth.uid()));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  reg_no text not null unique,
  name text not null,
  age int not null default 0,
  gender text not null default 'Other',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  blood_group text not null default '',
  allergies text[] not null default '{}',
  occupation text not null default '',
  active boolean not null default true,
  registered_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.case_histories (
  patient_id uuid primary key references public.patients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  date date not null default current_date,
  type text not null default 'New',
  complaint text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  potencies text[] not null default '{}',
  stock int not null default 0,
  price numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  date date not null default current_date,
  items jsonb not null default '[]'::jsonb,
  follow_up_date date,
  is_refill boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  prescription_id uuid references public.prescriptions(id) on delete set null,
  date date not null default current_date,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'Pending',
  payment_mode text,
  amount_received numeric not null default 0,
  ready_for_payment boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  due_date date not null,
  reason text not null default '',
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.clinic_settings (
  id int primary key default 1 check (id = 1),
  consultation_fee numeric not null default 400,
  follow_up_fee numeric not null default 250,
  registration_fee numeric not null default 100,
  low_stock_threshold int not null default 10,
  clinic_name text not null default 'HomeoCare Clinic',
  address text not null default '',
  phone text not null default '',
  doctor_name text not null default '',
  logo_data_url text
);
insert into public.clinic_settings (id) values (1);

do $$
declare t text;
begin
  foreach t in array array['patients','case_histories','visits','medicines','prescriptions','bills','follow_ups','templates','clinic_settings'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff read" on public.%I for select to authenticated using (public.is_staff(auth.uid()))', t);
  end loop;
end $$;

-- staff (doctor + receptionist) writes
create policy "staff insert" on public.patients for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff update" on public.patients for update to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert" on public.visits for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff insert" on public.bills for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff update" on public.bills for update to authenticated using (public.is_staff(auth.uid()));

-- doctor-only writes
create policy "doctor all" on public.case_histories for all to authenticated using (public.has_role(auth.uid(),'doctor')) with check (public.has_role(auth.uid(),'doctor'));
create policy "doctor all" on public.medicines for all to authenticated using (public.has_role(auth.uid(),'doctor')) with check (public.has_role(auth.uid(),'doctor'));
create policy "doctor all" on public.prescriptions for all to authenticated using (public.has_role(auth.uid(),'doctor')) with check (public.has_role(auth.uid(),'doctor'));
create policy "doctor all" on public.follow_ups for all to authenticated using (public.has_role(auth.uid(),'doctor')) with check (public.has_role(auth.uid(),'doctor'));
create policy "doctor all" on public.templates for all to authenticated using (public.has_role(auth.uid(),'doctor')) with check (public.has_role(auth.uid(),'doctor'));
create policy "doctor update" on public.clinic_settings for update to authenticated using (public.has_role(auth.uid(),'doctor'));
create policy "doctor delete" on public.patients for delete to authenticated using (public.has_role(auth.uid(),'doctor'));
create policy "doctor delete" on public.bills for delete to authenticated using (public.has_role(auth.uid(),'doctor'));
create policy "doctor visits update" on public.visits for update to authenticated using (public.has_role(auth.uid(),'doctor'));