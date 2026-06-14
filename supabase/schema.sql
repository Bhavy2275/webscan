-- supabase/schema.sql
-- Database Schema for Web Scanner App

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for profiles table
alter table public.profiles enable row level security;

-- Create scans table
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cloudinary_url text not null,
  public_id text not null,
  uploaded_at timestamp with time zone not null default now(),
  date_folder date not null default current_date
);

-- Create indexes on scans for optimization
create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_scans_date_folder on public.scans(date_folder);

-- Enable RLS for scans table
alter table public.scans enable row level security;

-- Helper function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql;

-- Profiles Policies
create policy "Allow users to view their own profile or admins to view all"
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

create policy "Allow users or admins to update profiles"
  on public.profiles
  for update
  using (auth.uid() = id or public.is_admin());

-- Scans Policies
create policy "Allow users to insert their own scans"
  on public.scans
  for insert
  with check (auth.uid() = user_id);

create policy "Only admins can view scans"
  on public.scans
  for select
  using (public.is_admin());

create policy "Only admins can delete scans"
  on public.scans
  for delete
  using (public.is_admin());

-- Automated Trigger to sync auth.users with public.profiles on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
