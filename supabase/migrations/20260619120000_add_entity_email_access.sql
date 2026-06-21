create table if not exists public.entity_accesses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  economic_entity_id uuid not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_accesses_email_check check (email = lower(trim(email)) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint entity_accesses_unique_email_entity unique (workspace_id, economic_entity_id, email),
  constraint entity_accesses_economic_entity_fk
    foreign key (workspace_id, economic_entity_id)
    references public.economic_entities(workspace_id, id)
    on delete cascade
);

create table if not exists public.workspace_admin_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_admin_emails_email_check check (email = lower(trim(email)) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint workspace_admin_emails_unique_email unique (workspace_id, email)
);

create index if not exists entity_accesses_email_idx on public.entity_accesses (email);
create index if not exists entity_accesses_workspace_email_idx on public.entity_accesses (workspace_id, email);
create index if not exists entity_accesses_workspace_entity_idx on public.entity_accesses (workspace_id, economic_entity_id);
create index if not exists workspace_admin_emails_email_idx on public.workspace_admin_emails (email);
create index if not exists workspace_admin_emails_workspace_email_idx on public.workspace_admin_emails (workspace_id, email);

create trigger entity_accesses_set_updated_at
before update on public.entity_accesses
for each row execute function public.set_updated_at();

create trigger workspace_admin_emails_set_updated_at
before update on public.workspace_admin_emails
for each row execute function public.set_updated_at();

alter table public.entity_accesses enable row level security;
alter table public.workspace_admin_emails enable row level security;

create or replace function public.current_profile_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(email)
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function public.current_profile_email() from public;
grant execute on function public.current_profile_email() to authenticated, service_role;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.profile_id = auth.uid()
      and wm.role = 'admin'
  )
  or exists (
    select 1
    from public.workspace_admin_emails wae
    where wae.workspace_id = target_workspace_id
      and wae.email = public.current_profile_email()
  );
$$;

revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_admin(uuid) to authenticated, service_role;

create or replace function public.has_entity_access(target_workspace_id uuid, target_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_workspace_admin(target_workspace_id)
    or exists (
      select 1
      from public.entity_accesses ea
      where ea.workspace_id = target_workspace_id
        and ea.economic_entity_id = target_entity_id
        and ea.email = public.current_profile_email()
    );
$$;

revoke all on function public.has_entity_access(uuid, uuid) from public;
grant execute on function public.has_entity_access(uuid, uuid) to authenticated, service_role;

create or replace function public.can_read_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_workspace_member(target_workspace_id)
    or exists (
      select 1
      from public.entity_accesses ea
      where ea.workspace_id = target_workspace_id
        and ea.email = public.current_profile_email()
    );
$$;

revoke all on function public.can_read_workspace(uuid) from public;
grant execute on function public.can_read_workspace(uuid) to authenticated, service_role;

drop policy if exists "Members can read their workspaces" on public.workspaces;
create policy "Users can read accessible workspaces"
on public.workspaces for select
to authenticated
using (public.can_read_workspace(id));

drop policy if exists "Members can read workspace membership" on public.workspace_members;
create policy "Users can read relevant workspace membership"
on public.workspace_members for select
to authenticated
using (profile_id = auth.uid() or public.is_workspace_admin(workspace_id));

drop policy if exists "Members can read economic entities" on public.economic_entities;
create policy "Users can read accessible economic entities"
on public.economic_entities for select
to authenticated
using (public.has_entity_access(workspace_id, id));

drop policy if exists "Members can read bank accounts" on public.bank_accounts;
create policy "Users can read accessible bank accounts"
on public.bank_accounts for select
to authenticated
using (public.has_entity_access(workspace_id, economic_entity_id));

drop policy if exists "Members can read categories" on public.categories;
create policy "Users can read categories in accessible workspaces"
on public.categories for select
to authenticated
using (public.can_read_workspace(workspace_id));

drop policy if exists "Members can read imports" on public.imports;
create policy "Users can read accessible imports"
on public.imports for select
to authenticated
using (public.has_entity_access(workspace_id, economic_entity_id));

drop policy if exists "Members can read transactions" on public.transactions;
create policy "Users can read accessible transactions"
on public.transactions for select
to authenticated
using (public.has_entity_access(workspace_id, economic_entity_id));

create policy "Users can read their entity access"
on public.entity_accesses for select
to authenticated
using (email = public.current_profile_email() or public.is_workspace_admin(workspace_id));

create policy "Admins can manage entity access"
on public.entity_accesses for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Admins can read admin email access"
on public.workspace_admin_emails for select
to authenticated
using (public.is_workspace_admin(workspace_id));

create policy "Admins can manage admin email access"
on public.workspace_admin_emails for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

insert into public.workspace_admin_emails (workspace_id, email)
select id, 'danitmp@gmail.com'
from public.workspaces
where name = 'Familia Dani'
on conflict do nothing;

with family_workspace as (
  select id
  from public.workspaces
  where name = 'Familia Dani'
),
target_entities as (
  select ee.workspace_id, ee.id, lower(ee.name) as name
  from public.economic_entities ee
  join family_workspace fw on fw.id = ee.workspace_id
),
access_rows(email, entity_name) as (
  values
    ('kristinasolano@gmail.com', 'cris'),
    ('kristinasolano@gmail.com', 'casa'),
    ('ainaantuna@gmail.com', 'aina'),
    ('daniantunya@gmail.com', 'danielin')
)
insert into public.entity_accesses (workspace_id, economic_entity_id, email)
select te.workspace_id, te.id, ar.email
from access_rows ar
join target_entities te on te.name = ar.entity_name
on conflict do nothing;

with family_workspace as (
  select id
  from public.workspaces
  where name = 'Familia Dani'
),
dani_profile as (
  select id
  from public.profiles
  where lower(email) = 'danitmp@gmail.com'
)
insert into public.workspace_members (workspace_id, profile_id, role)
select fw.id, dp.id, 'admin'
from family_workspace fw
cross join dani_profile dp
on conflict do nothing;
