alter table public.entity_accesses
add column if not exists can_manage boolean not null default false;

create or replace function public.can_manage_entity(target_workspace_id uuid, target_entity_id uuid)
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
        and ea.can_manage
    );
$$;

revoke all on function public.can_manage_entity(uuid, uuid) from public;
grant execute on function public.can_manage_entity(uuid, uuid) to authenticated, service_role;

drop policy if exists "Entity managers can manage bank accounts" on public.bank_accounts;
create policy "Entity managers can manage bank accounts"
on public.bank_accounts for all
to authenticated
using (public.can_manage_entity(workspace_id, economic_entity_id))
with check (public.can_manage_entity(workspace_id, economic_entity_id));

drop policy if exists "Entity managers can manage imports" on public.imports;
create policy "Entity managers can manage imports"
on public.imports for all
to authenticated
using (public.can_manage_entity(workspace_id, economic_entity_id))
with check (public.can_manage_entity(workspace_id, economic_entity_id));

drop policy if exists "Entity managers can manage transactions" on public.transactions;
create policy "Entity managers can manage transactions"
on public.transactions for all
to authenticated
using (public.can_manage_entity(workspace_id, economic_entity_id))
with check (public.can_manage_entity(workspace_id, economic_entity_id));

update public.entity_accesses
set can_manage = true
where email = 'kristinasolano@gmail.com';
