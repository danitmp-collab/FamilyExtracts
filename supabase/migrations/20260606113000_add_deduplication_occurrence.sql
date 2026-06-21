drop index if exists public.transactions_deduplication_idx;

update public.transactions
set deduplication_key = concat(deduplication_key, '|1')
where deduplication_key !~ '\|[0-9]+$';

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
    keyed_rows.computed_deduplication_key
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
