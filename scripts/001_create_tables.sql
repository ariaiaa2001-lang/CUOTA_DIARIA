-- =============================================
-- Cuota Diaria - Microloans Platform
-- Database Schema
-- =============================================

-- 1. PROFILES TABLE (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'collector' check (role in ('admin', 'collector')),
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CLIENTS TABLE
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  id_number text unique,
  phone text,
  phone_secondary text,
  address text,
  photo_url text,
  notes text,
  status text not null default 'active' check (status in ('active', 'in_arrears', 'paid', 'inactive')),
  collector_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. LOANS TABLE
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  collector_id uuid references public.profiles(id) on delete set null,
  principal_amount numeric(12,2) not null check (principal_amount > 0),
  interest_rate numeric(5,2) not null check (interest_rate >= 0),
  total_interest numeric(12,2) not null,
  total_debt numeric(12,2) not null,
  total_installments integer not null check (total_installments > 0),
  daily_installment numeric(12,2) not null,
  amount_paid numeric(12,2) default 0,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'defaulted')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. INSTALLMENTS TABLE
create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount_due numeric(12,2) not null,
  amount_paid numeric(12,2) default 0,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue')),
  paid_at timestamptz,
  created_at timestamptz default now(),
  
  unique(loan_id, installment_number)
);

-- 5. PAYMENTS TABLE
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  installment_id uuid references public.installments(id) on delete set null,
  loan_id uuid not null references public.loans(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  collector_id uuid references public.profiles(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- 6. CASH TRANSACTIONS TABLE
create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text not null check (category in ('payment', 'loan_disbursement', 'salary', 'transport', 'office', 'other')),
  amount numeric(12,2) not null check (amount > 0),
  description text,
  reference_id uuid,
  collector_id uuid references public.profiles(id) on delete set null,
  transaction_date date not null default current_date,
  created_at timestamptz default now()
);

-- =============================================
-- INDEXES
-- =============================================

create index if not exists idx_clients_collector on public.clients(collector_id);
create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_loans_client on public.loans(client_id);
create index if not exists idx_loans_collector on public.loans(collector_id);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_installments_loan on public.installments(loan_id);
create index if not exists idx_installments_due_date on public.installments(due_date);
create index if not exists idx_installments_status on public.installments(status);
create index if not exists idx_payments_loan on public.payments(loan_id);
create index if not exists idx_payments_date on public.payments(payment_date);
create index if not exists idx_payments_collector on public.payments(collector_id);
create index if not exists idx_cash_transactions_date on public.cash_transactions(transaction_date);
create index if not exists idx_cash_transactions_collector on public.cash_transactions(collector_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.loans enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.cash_transactions enable row level security;

-- Helper function to get user role
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- PROFILES POLICIES
create policy "profiles_select_all" on public.profiles 
  for select using (true);

create policy "profiles_insert_own" on public.profiles 
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles 
  for update using (auth.uid() = id or public.get_user_role() = 'admin');

create policy "profiles_delete_admin" on public.profiles 
  for delete using (public.get_user_role() = 'admin');

-- CLIENTS POLICIES
create policy "clients_select" on public.clients 
  for select using (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
  );

create policy "clients_insert" on public.clients 
  for insert with check (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
  );

create policy "clients_update" on public.clients 
  for update using (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
  );

create policy "clients_delete" on public.clients 
  for delete using (public.get_user_role() = 'admin');

-- LOANS POLICIES
create policy "loans_select" on public.loans 
  for select using (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
    or client_id in (select id from public.clients where collector_id = auth.uid())
  );

create policy "loans_insert" on public.loans 
  for insert with check (public.get_user_role() = 'admin');

create policy "loans_update" on public.loans 
  for update using (public.get_user_role() = 'admin');

create policy "loans_delete" on public.loans 
  for delete using (public.get_user_role() = 'admin');

-- INSTALLMENTS POLICIES
create policy "installments_select" on public.installments 
  for select using (
    loan_id in (select id from public.loans)
  );

create policy "installments_insert" on public.installments 
  for insert with check (public.get_user_role() = 'admin');

create policy "installments_update" on public.installments 
  for update using (
    loan_id in (select id from public.loans)
  );

create policy "installments_delete" on public.installments 
  for delete using (public.get_user_role() = 'admin');

-- PAYMENTS POLICIES
create policy "payments_select" on public.payments 
  for select using (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
  );

create policy "payments_insert" on public.payments 
  for insert with check (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
  );

create policy "payments_update" on public.payments 
  for update using (public.get_user_role() = 'admin');

create policy "payments_delete" on public.payments 
  for delete using (public.get_user_role() = 'admin');

-- CASH TRANSACTIONS POLICIES
create policy "cash_transactions_select" on public.cash_transactions 
  for select using (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
  );

create policy "cash_transactions_insert" on public.cash_transactions 
  for insert with check (
    public.get_user_role() = 'admin' 
    or collector_id = auth.uid()
  );

create policy "cash_transactions_update" on public.cash_transactions 
  for update using (public.get_user_role() = 'admin');

create policy "cash_transactions_delete" on public.cash_transactions 
  for delete using (public.get_user_role() = 'admin');

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'collector')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Update timestamps
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

create trigger update_clients_updated_at
  before update on public.clients
  for each row
  execute function public.update_updated_at();

create trigger update_loans_updated_at
  before update on public.loans
  for each row
  execute function public.update_updated_at();

-- Update loan amount_paid when payment is made
create or replace function public.update_loan_on_payment()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Update the loan's amount_paid
  update public.loans
  set amount_paid = amount_paid + new.amount
  where id = new.loan_id;
  
  -- Update installment if linked
  if new.installment_id is not null then
    update public.installments
    set 
      amount_paid = amount_paid + new.amount,
      status = case 
        when amount_paid + new.amount >= amount_due then 'paid'
        when amount_paid + new.amount > 0 then 'partial'
        else status
      end,
      paid_at = case 
        when amount_paid + new.amount >= amount_due then now()
        else paid_at
      end
    where id = new.installment_id;
  end if;
  
  -- Check if loan is fully paid
  update public.loans
  set status = 'completed'
  where id = new.loan_id 
    and amount_paid >= total_debt;
  
  return new;
end;
$$;

create trigger on_payment_insert
  after insert on public.payments
  for each row
  execute function public.update_loan_on_payment();

-- Update installment status to overdue if past due date
create or replace function public.mark_overdue_installments()
returns void
language plpgsql
security definer
as $$
begin
  update public.installments
  set status = 'overdue'
  where due_date < current_date
    and status in ('pending', 'partial');
    
  -- Update client status based on overdue installments
  update public.clients c
  set status = 'in_arrears'
  where exists (
    select 1 from public.loans l
    join public.installments i on i.loan_id = l.id
    where l.client_id = c.id
      and l.status = 'active'
      and i.status = 'overdue'
  )
  and c.status != 'in_arrears';
end;
$$;
