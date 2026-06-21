alter table public.transactions
add column if not exists source_row_number integer;

with ordered_transactions as (
  select
    id,
    row_number() over (partition by import_id order by ctid)::integer as source_row_number
  from public.transactions
  where source_row_number is null
)
update public.transactions as transactions
set source_row_number = ordered_transactions.source_row_number
from ordered_transactions
where transactions.id = ordered_transactions.id;

create index if not exists transactions_latest_balance_idx
on public.transactions (
  workspace_id,
  economic_entity_id,
  bank_account_id,
  fecha_operativa desc,
  created_at desc,
  source_row_number asc
)
where saldo is not null;

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

  if not public.can_manage_entity(p_workspace_id, p_economic_entity_id) then
    raise exception 'User cannot manage this economic entity.';
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
    deduplication_key,
    source_row_number
  )
  with parsed_rows as (
    select
      row_json ->> 'status' as status,
      (row_json ->> 'fecha_operativa')::date as fecha_operativa,
      nullif(row_json ->> 'fecha_valor', '')::date as fecha_valor,
      row_json ->> 'concepto_original' as concepto_original,
      row_json ->> 'concepto_normalizado' as concepto_normalizado,
      row_json ->> 'grupo_concepto' as grupo_concepto,
      (row_json ->> 'importe')::numeric as importe,
      nullif(row_json ->> 'saldo', '')::numeric as saldo,
      row_json ->> 'referencia' as referencia,
      row_json -> 'errors' as errors,
      coalesce(nullif(row_json ->> 'rowNumber', '')::integer, source.ordinality::integer) as source_row_number,
      source.ordinality,
      concat_ws(
        '|',
        (row_json ->> 'fecha_operativa')::date::text,
        coalesce(row_json ->> 'concepto_normalizado', 'SIN CONCEPTO'),
        to_char((row_json ->> 'importe')::numeric, 'FM999999999999990.00'),
        coalesce(to_char(nullif(row_json ->> 'saldo', '')::numeric, 'FM999999999999990.00'), ''),
        coalesce(regexp_replace(trim(row_json ->> 'referencia'), '\s+', ' ', 'g'), '')
      ) as deduplication_base_key
    from jsonb_array_elements(p_rows) with ordinality as source(row_json, ordinality)
    where row_json ->> 'fecha_operativa' is not null
      and row_json ->> 'importe' is not null
      and coalesce(jsonb_array_length(row_json -> 'errors'), 0) = 0
  ),
  keyed_rows as (
    select
      *,
      concat(
        deduplication_base_key,
        '|',
        row_number() over (partition by deduplication_base_key order by ordinality)
      ) as computed_deduplication_key
    from parsed_rows
  )
  select
    p_workspace_id,
    p_economic_entity_id,
    p_bank_account_id,
    v_import_id,
    keyed_rows.fecha_operativa,
    keyed_rows.fecha_valor,
    coalesce(keyed_rows.concepto_original, ''),
    coalesce(keyed_rows.concepto_normalizado, 'SIN CONCEPTO'),
    coalesce(keyed_rows.grupo_concepto, 'Sin concepto'),
    keyed_rows.importe,
    keyed_rows.saldo,
    keyed_rows.referencia,
    keyed_rows.computed_deduplication_key,
    keyed_rows.source_row_number
  from keyed_rows
  where keyed_rows.status = 'new';

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
) from public, anon;

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

create or replace function public.delete_import_with_transactions(
  p_workspace_id uuid,
  p_economic_entity_id uuid,
  p_bank_account_id uuid,
  p_import_id uuid
)
returns table (
  transactions_deleted integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_file_name text;
  v_transactions_deleted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.can_manage_entity(p_workspace_id, p_economic_entity_id) then
    raise exception 'User cannot manage this economic entity.';
  end if;

  select imports.file_name
  into v_file_name
  from public.imports
  where imports.workspace_id = p_workspace_id
    and imports.economic_entity_id = p_economic_entity_id
    and imports.bank_account_id = p_bank_account_id
    and imports.id = p_import_id
  for update;

  if not found then
    raise exception 'Import does not belong to the selected account.';
  end if;

  if v_file_name = 'Movimiento manual en efectivo' then
    raise exception 'Manual cash movements must be deleted from their movement screen.';
  end if;

  delete from public.transactions
  where transactions.workspace_id = p_workspace_id
    and transactions.economic_entity_id = p_economic_entity_id
    and transactions.bank_account_id = p_bank_account_id
    and transactions.import_id = p_import_id;

  get diagnostics v_transactions_deleted = row_count;

  delete from public.imports
  where imports.workspace_id = p_workspace_id
    and imports.economic_entity_id = p_economic_entity_id
    and imports.bank_account_id = p_bank_account_id
    and imports.id = p_import_id;

  transactions_deleted := v_transactions_deleted;
  return next;
end;
$$;

revoke all on function public.delete_import_with_transactions(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.delete_import_with_transactions(uuid, uuid, uuid, uuid) to authenticated, service_role;
