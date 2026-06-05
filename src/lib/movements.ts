import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";

export type MovementType = "income" | "expense";

export type MovementFilters = {
  dateFrom?: string;
  dateTo?: string;
  concept?: string;
  amountMin?: string;
  amountMax?: string;
  type?: MovementType;
};

export type AccountMovement = {
  id: string;
  import_id: string | null;
  fecha_operativa: string;
  concepto_original: string;
  concepto_normalizado: string;
  importe: number | string;
  imports: {
    id: string;
    file_name: string;
    created_at: string;
  } | null;
};

type SupabaseMovementRow = Omit<AccountMovement, "imports"> & {
  imports:
    | {
        id: string;
        file_name: string;
        created_at: string;
      }
    | Array<{
        id: string;
        file_name: string;
        created_at: string;
      }>
    | null;
};

export async function listMovementsForAccount(
  entityId: string,
  accountId: string,
  filters: MovementFilters
) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      movements: [] as AccountMovement[]
    };
  }

  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      "id, import_id, fecha_operativa, concepto_original, concepto_normalizado, importe, imports(id, file_name, created_at)"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id);

  if (filters.dateFrom) {
    query = query.gte("fecha_operativa", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("fecha_operativa", filters.dateTo);
  }

  if (filters.concept) {
    query = query.or(
      `concepto_original.ilike.%${escapeLike(filters.concept)}%,concepto_normalizado.ilike.%${escapeLike(filters.concept)}%`
    );
  }

  if (filters.amountMin) {
    query = query.gte("importe", filters.amountMin);
  }

  if (filters.amountMax) {
    query = query.lte("importe", filters.amountMax);
  }

  if (filters.type === "income") {
    query = query.gt("importe", 0);
  }

  if (filters.type === "expense") {
    query = query.lt("importe", 0);
  }

  const { data, error } = await query
    .order("fecha_operativa", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<SupabaseMovementRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar los movimientos: ${error.message}`);
  }

  return {
    workspace,
    entity,
    account,
    movements: data.map((movement) => ({
      ...movement,
      imports: Array.isArray(movement.imports) ? movement.imports[0] ?? null : movement.imports
    }))
  };
}

export function parseMovementFilters(searchParams: Record<string, string | string[] | undefined>): MovementFilters {
  const type = getString(searchParams.type);

  return {
    dateFrom: normalizeDateFilter(getString(searchParams.dateFrom)),
    dateTo: normalizeDateFilter(getString(searchParams.dateTo)),
    concept: getString(searchParams.concept).trim(),
    amountMin: normalizeAmountFilter(getString(searchParams.amountMin)),
    amountMax: normalizeAmountFilter(getString(searchParams.amountMax)),
    type: type === "income" || type === "expense" ? type : undefined
  };
}

export function getMovementType(importe: number | string): MovementType {
  return Number(importe) >= 0 ? "income" : "expense";
}

export function getMovementTypeLabel(type: MovementType) {
  return type === "income" ? "Ingreso" : "Gasto";
}

function getString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeDateFilter(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeAmountFilter(value: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(",", ".");
  return Number.isFinite(Number(normalized)) ? normalized : undefined;
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, "");
}
