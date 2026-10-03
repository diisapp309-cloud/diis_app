-- Digital Invoice Integrity System (DIIS) schema.
-- Run once in Supabase Dashboard -> SQL Editor (safe to re-run).
--
-- Rules enforced here (not just in the UI):
--   * Users see only their own records.
--   * Users may edit a record only on the same day (Asia/Karachi) they submitted it.
--   * The admin (diisapp309@gmail.com) sees, adds, edits and deletes every record.
--   * Every edit and delete is kept in record_history.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  full_name   text,
  role        text not null default 'user' check (role in ('admin', 'user')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

-- Calendar day in Pakistan time; used for the "edit only on the same day" rule.
create or replace function public.pk_date(ts timestamptz)
returns date language sql stable as $$
  select (ts at time zone 'Asia/Karachi')::date;
$$;

-- Every new auth user gets a profile. The owner account becomes admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    new.raw_user_meta_data ->> 'full_name',
    case when lower(new.email) = 'diisapp309@gmail.com' then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: covers the admin account if it was created before this script ran.
insert into public.profiles (id, username, role)
select id,
       lower(split_part(email, '@', 1)),
       case when lower(email) = 'diisapp309@gmail.com' then 'admin' else 'user' end
from auth.users
on conflict (id) do nothing;

update public.profiles set role = 'admin', is_active = true
where id in (select id from auth.users where lower(email) = 'diisapp309@gmail.com');

-- ---------------------------------------------------------------- records
create table if not exists public.records (
  id                  bigint generated always as identity primary key,
  vehicle_number      text not null check (char_length(vehicle_number) between 1 and 32),
  record_at           timestamptz not null,
  sender_name         text not null check (char_length(sender_name) between 1 and 200),
  fbr_invoice_number  text not null check (char_length(fbr_invoice_number) between 1 and 100),
  sender_ntn          text not null check (char_length(sender_ntn) between 1 and 20),
  goods_value         numeric(16, 2) not null check (goods_value >= 0),
  sales_tax           numeric(16, 2) not null check (sales_tax >= 0),
  receiver_name       text not null check (char_length(receiver_name) between 1 and 200),
  receiver_ntn        text not null check (char_length(receiver_ntn) between 1 and 20),
  created_by          uuid not null default auth.uid()
                        constraint records_created_by_fkey references public.profiles (id),
  entered_by          uuid default auth.uid()
                        constraint records_entered_by_fkey references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  updated_by          uuid constraint records_updated_by_fkey references public.profiles (id)
);

create index if not exists records_record_at_idx on public.records (record_at desc);
create index if not exists records_owner_record_at_idx on public.records (created_by, record_at desc);

-- Server-controlled columns: clients cannot fake ownership or timestamps.
create or replace function public.records_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Only the admin may file a record on behalf of another user.
    if new.created_by is null or not public.is_admin() then
      new.created_by := auth.uid();
    end if;
    new.entered_by := auth.uid();
    new.created_at := now();
    new.updated_at := null;
    new.updated_by := null;
  else
    new.created_by := old.created_by;
    new.entered_by := old.entered_by;
    new.created_at := old.created_at;
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists records_before_write on public.records;
create trigger records_before_write
  before insert or update on public.records
  for each row execute function public.records_before_write();

-- ---------------------------------------------------------------- history
create table if not exists public.record_history (
  id          bigint generated always as identity primary key,
  record_id   bigint not null,           -- no FK: history survives deletes
  action      text not null check (action in ('update', 'delete')),
  changed_by  uuid constraint record_history_changed_by_fkey
                references public.profiles (id) on delete set null,
  changed_at  timestamptz not null default now(),
  old_data    jsonb not null,
  new_data    jsonb
);

create index if not exists record_history_record_idx on public.record_history (record_id, changed_at desc);

create or replace function public.records_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.record_history (record_id, action, changed_by, old_data, new_data)
    values (old.id, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  end if;
  insert into public.record_history (record_id, action, changed_by, old_data, new_data)
  values (old.id, 'delete', auth.uid(), to_jsonb(old), null);
  return old;
end;
$$;

drop trigger if exists records_audit on public.records;
create trigger records_audit
  after update or delete on public.records
  for each row execute function public.records_audit();

-- ---------------------------------------------------------------- row level security
alter table public.profiles       enable row level security;
alter table public.records        enable row level security;
alter table public.record_history enable row level security;

revoke all on public.profiles, public.records, public.record_history from anon;

-- profiles: read own row; admin reads all. Writes go through the server (secret key) only.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- records
drop policy if exists records_select on public.records;
create policy records_select on public.records
  for select to authenticated
  using (public.is_admin() or (created_by = auth.uid() and public.is_active_user()));

drop policy if exists records_insert on public.records;
create policy records_insert on public.records
  for insert to authenticated
  with check (public.is_admin() or (created_by = auth.uid() and public.is_active_user()));

drop policy if exists records_update on public.records;
create policy records_update on public.records
  for update to authenticated
  using (
    public.is_admin()
    or (created_by = auth.uid() and public.is_active_user()
        and public.pk_date(created_at) = public.pk_date(now()))
  )
  with check (
    public.is_admin()
    or (created_by = auth.uid() and public.pk_date(created_at) = public.pk_date(now()))
  );

drop policy if exists records_delete on public.records;
create policy records_delete on public.records
  for delete to authenticated
  using (public.is_admin());

-- history: admin only
drop policy if exists record_history_select on public.record_history;
create policy record_history_select on public.record_history
  for select to authenticated
  using (public.is_admin());
