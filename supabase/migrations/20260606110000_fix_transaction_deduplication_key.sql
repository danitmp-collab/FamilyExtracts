alter table public.transactions
add column if not exists deduplication_key text;

update public.transactions
set deduplication_key = concat_ws(
  '|',
  fecha_operativa::text,
  concepto_normalizado,
  to_char(importe, 'FM999999999999990.00'),
  coalesce(to_char(saldo, 'FM999999999999990.00'), ''),
  coalesce(regexp_replace(trim(referencia), '\s+', ' ', 'g'), '')
)
where deduplication_key is null;

alter table public.transactions
alter column deduplication_key set not null;

drop index if exists public.transactions_deduplication_idx;

create unique index transactions_deduplication_idx
  on public.transactions (bank_account_id, deduplication_key);

create or replace function public.complete_import_from_preview(
  p_workspace_id uuid,
  p_economic_entity_id uuid,
  p_bank_account_id uuid,
  p_file_name text,
  p_rows_total integer,
  p_rows_duplicates integer,
  p_rows_failed integer,
  p_rows jsonb
)
returns table (
  import_id uuid,
  rows_imported integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import_id uuid;
  v_rows_imported integer := 0;
  v_uploaded_by uuid := auth.uid();
begin
  if v_uploaded_by is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'User is not an admin of this workspace.';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows payload must be a JSON array.';
  end if;

  perform 1
  from public.bank_accounts ba
  where ba.workspace_id = p_workspace_id
    and ba.economic_entity_id = p_economic_entity_id
    and ba.id = p_bank_account_id;

  if not found then
    raise exception 'Bank account does not belong to the selected entity and workspace.';
  end if;

  insert into public.imports (
    workspace_id,
    economic_entity_id,
    bank_account_id,
    uploaded_by,
    file_name,
    status,
    rows_total,
    rows_imported,
    rows_duplicates,
    rows_failed
  )
  values (
    p_workspace_id,
    p_economic_entity_id,
    p_bank_account_id,
    v_uploaded_by,
    p_file_name,
    'completed',
    greatest(p_rows_total, 0),
    0,
    greatest(p_rows_duplicates, 0),
    greatest(p_rows_failed, 0)
  )
  returning id into v_import_id;

  insert into public.transactions (
    workspace_id,
    economic_entity_id,
    bank_account_id,
    import_id,
    fecha_operativa,
    fecha_valor,
    concepto_original,
    concepto_normalizado,
    grupo_concepto,
    importe,
    saldo,
    referencia,
    deduplication_key
  )
  select
    p_workspace_id,
    p_economic_entity_id,
    p_bank_account_id,
    v_import_id,
    row_data.fecha_operativa,
    row_data.fecha_valor,
    coalesce(row_data.concepto_original, ''),
    coalesce(row_data.concepto_normalizado, 'SIN CONCEPTO'),
    coalesce(row_data.grupo_concepto, 'Sin concepto'),
    row_data.importe,
    row_data.saldo,
    row_data.referencia,
    concat_ws(
      '|',
      row_data.fecha_operativa::text,
      coalesce(row_data.concepto_normalizado, 'SIN CONCEPTO'),
      to_char(row_data.importe, 'FM999999999999990.00'),
      coalesce(to_char(row_data.saldo, 'FM999999999999990.00'), ''),
      coalesce(regexp_replace(trim(row_data.referencia), '\s+', ' ', 'g'), '')
    )
  from jsonb_to_recordset(p_rows) as row_data(
    status text,
    fecha_operativa date,
    fecha_valor date,
    concepto_original text,
    concepto_normalizado text,
    grupo_concepto text,
    importe numeric,
    saldo numeric,
    referencia text,
    errors jsonb
  )
  where row_data.status = 'new'
    and row_data.fecha_operativa is not null
    and row_data.importe is not null
    and coalesce(jsonb_array_length(row_data.errors), 0) = 0;

  get diagnostics v_rows_imported = row_count;

  update public.imports
  set rows_imported = v_rows_imported
  where id = v_import_id;

  import_id := v_import_id;
  rows_imported := v_rows_imported;
  return next;
end;
$$;

revoke all on function public.complete_import_from_preview(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  integer,
  integer,
  jsonb
) from public;

grant execute on function public.complete_import_from_preview(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  integer,
  integer,
  jsonb
) to authenticated, service_role;
