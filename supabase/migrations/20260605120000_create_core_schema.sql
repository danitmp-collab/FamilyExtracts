create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_role_check check (role in ('admin')),
  constraint workspace_members_unique_member unique (workspace_id, profile_id)
);

create table public.economic_entities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null default 'other',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint economic_entities_type_check check (type in ('person', 'household', 'business', 'other')),
  constraint economic_entities_workspace_id_id_unique unique (workspace_id, id),
  constraint economic_entities_unique_name unique (workspace_id, name)
);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  economic_entity_id uuid not null,
  name text not null,
  bank_name text,
  iban_last4 text,
  currency text not null default 'EUR',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_iban_last4_check check (iban_last4 is null or iban_last4 ~ '^[0-9]{4}$'),
  constraint bank_accounts_currency_check check (char_length(currency) = 3),
  constraint bank_accounts_workspace_id_id_unique unique (workspace_id, id),
  constraint bank_accounts_workspace_id_id_entity_id_unique unique (workspace_id, id, economic_entity_id),
  constraint bank_accounts_economic_entity_fk
    foreign key (workspace_id, economic_entity_id)
    references public.economic_entities(workspace_id, id),
  constraint bank_accounts_unique_name unique (workspace_id, economic_entity_id, name)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null default 'neutral',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_type_check check (type in ('income', 'expense', 'neutral')),
  constraint categories_workspace_id_id_unique unique (workspace_id, id),
  constraint categories_unique_name unique (workspace_id, name)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  economic_entity_id uuid not null,
  bank_account_id uuid not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  file_name text not null,
  status text not null default 'preview',
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_duplicates integer not null default 0,
  rows_failed integer not null default 0,
  created_at timestamptz not null default now(),
  constraint imports_status_check check (status in ('preview', 'completed', 'failed')),
  constraint imports_rows_total_check check (rows_total >= 0),
  constraint imports_rows_imported_check check (rows_imported >= 0),
  constraint imports_rows_duplicates_check check (rows_duplicates >= 0),
  constraint imports_rows_failed_check check (rows_failed >= 0),
  constraint imports_workspace_id_id_unique unique (workspace_id, id),
  constraint imports_workspace_id_id_entity_id_account_id_unique unique (
    workspace_id,
    id,
    economic_entity_id,
    bank_account_id
  ),
  constraint imports_economic_entity_fk
    foreign key (workspace_id, economic_entity_id)
    references public.economic_entities(workspace_id, id),
  constraint imports_bank_account_fk
    foreign key (workspace_id, bank_account_id, economic_entity_id)
    references public.bank_accounts(workspace_id, id, economic_entity_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  economic_entity_id uuid not null,
  bank_account_id uuid not null,
  import_id uuid not null,
  fecha_operativa date not null,
  fecha_valor date,
  concepto_original text not null default '',
  concepto_normalizado text not null default 'SIN CONCEPTO',
  grupo_concepto text not null default 'Sin concepto',
  importe numeric(14, 2) not null,
  saldo numeric(14, 2),
  referencia text,
  deduplication_key text not null,
  category_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_workspace_id_id_unique unique (workspace_id, id),
  constraint transactions_economic_entity_fk
    foreign key (workspace_id, economic_entity_id)
    references public.economic_entities(workspace_id, id),
  constraint transactions_bank_account_fk
    foreign key (workspace_id, bank_account_id, economic_entity_id)
    references public.bank_accounts(workspace_id, id, economic_entity_id),
  constraint transactions_import_fk
    foreign key (workspace_id, import_id, economic_entity_id, bank_account_id)
    references public.imports(workspace_id, id, economic_entity_id, bank_account_id),
  constraint transactions_category_fk
    foreign key (workspace_id, category_id)
    references public.categories(workspace_id, id)
    on delete restrict
);

create index workspaces_name_idx on public.workspaces (name);
create index profiles_email_idx on public.profiles (email);
create index workspace_members_profile_id_idx on public.workspace_members (profile_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index economic_entities_workspace_active_idx on public.economic_entities (workspace_id, active);
create index bank_accounts_workspace_entity_idx on public.bank_accounts (workspace_id, economic_entity_id);
create index bank_accounts_workspace_active_idx on public.bank_accounts (workspace_id, active);
create index categories_workspace_active_idx on public.categories (workspace_id, active);
create index imports_workspace_account_created_idx on public.imports (workspace_id, bank_account_id, created_at desc);
create index imports_uploaded_by_idx on public.imports (uploaded_by);
create index transactions_workspace_date_idx on public.transactions (workspace_id, fecha_operativa desc);
create index transactions_account_date_idx on public.transactions (bank_account_id, fecha_operativa desc);
create index transactions_entity_date_idx on public.transactions (economic_entity_id, fecha_operativa desc);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_grupo_concepto_idx on public.transactions (workspace_id, grupo_concepto);
create index transactions_concepto_normalizado_idx on public.transactions (workspace_id, concepto_normalizado);

create unique index transactions_deduplication_idx
  on public.transactions (bank_account_id, deduplication_key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

create trigger economic_entities_set_updated_at
before update on public.economic_entities
for each row execute function public.set_updated_at();

create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

create or replace function public.is_workspace_member(target_workspace_id uuid)
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
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

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
  );
$$;

revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_admin(uuid) to authenticated, service_role;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.economic_entities enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.imports enable row level security;
alter table public.transactions enable row level security;

create policy "Members can read their workspaces"
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));

create policy "Admins can update their workspaces"
on public.workspaces for update
to authenticated
using (public.is_workspace_admin(id))
with check (public.is_workspace_admin(id));

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Members can read workspace membership"
on public.workspace_members for select
to authenticated
using (profile_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "Admins can manage workspace membership"
on public.workspace_members for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Members can read economic entities"
on public.economic_entities for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Admins can manage economic entities"
on public.economic_entities for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Members can read bank accounts"
on public.bank_accounts for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Admins can manage bank accounts"
on public.bank_accounts for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Members can read categories"
on public.categories for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Admins can manage categories"
on public.categories for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Members can read imports"
on public.imports for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Admins can manage imports"
on public.imports for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Members can read transactions"
on public.transactions for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Admins can manage transactions"
on public.transactions for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));
