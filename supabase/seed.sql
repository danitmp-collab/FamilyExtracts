select set_config('app.seed_admin_email', 'danitmp@gmail.com', false);

do $$
declare
  admin_email text := nullif(current_setting('app.seed_admin_email', true), '');
  admin_user_id uuid;
  family_workspace_id uuid;
begin
  if admin_email is null or admin_email = 'REPLACE_WITH_DANI_EMAIL' then
    raise exception 'Set app.seed_admin_email to Dani auth email before running seeds.';
  end if;

  select id
  into admin_user_id
  from auth.users
  where lower(email) = lower(admin_email)
  order by created_at
  limit 1;

  if admin_user_id is null then
    raise exception 'Auth user with email % does not exist. Create Dani in Supabase Auth first.', admin_email;
  end if;

  insert into public.profiles (id, email, display_name)
  values (admin_user_id, admin_email, 'Dani')
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = 'Dani',
    updated_at = now();

  select id
  into family_workspace_id
  from public.workspaces
  where name = 'Familia Dani'
  order by created_at
  limit 1;

  if family_workspace_id is null then
    insert into public.workspaces (name)
    values ('Familia Dani')
    returning id into family_workspace_id;
  else
    update public.workspaces
    set name = 'Familia Dani'
    where id = family_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, profile_id, role)
  values (family_workspace_id, admin_user_id, 'admin')
  on conflict (workspace_id, profile_id) do update
  set
    role = 'admin',
    updated_at = now();

  insert into public.economic_entities (workspace_id, name, type, active)
  values
    (family_workspace_id, 'Dani', 'person', true),
    (family_workspace_id, 'Cris', 'person', true),
    (family_workspace_id, 'Madre', 'person', true),
    (family_workspace_id, 'Aina', 'person', true),
    (family_workspace_id, 'Danielin', 'person', true),
    (family_workspace_id, 'Casa', 'household', true),
    (family_workspace_id, 'Taller', 'business', true)
  on conflict (workspace_id, name) do update
  set
    type = excluded.type,
    active = true,
    updated_at = now();
end;
$$;
