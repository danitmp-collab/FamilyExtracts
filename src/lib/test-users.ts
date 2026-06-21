import { listEconomicEntities, type EconomicEntity } from "@/lib/economic-entities";
import { createClient } from "@/lib/supabase/server";

export type TestUserView = {
  key: string;
  label: string;
  description: string;
  href: string;
  scope: "all" | "entity" | "account";
  entity: EconomicEntity | null;
  accountName?: string;
};

const testUsers = [
  {
    key: "dani",
    label: "Dani",
    description: "Vista completa de todas las entidades y cuentas.",
    scope: "all" as const,
    entityNames: ["Dani"]
  },
  {
    key: "danilin",
    label: "Danielin",
    description: "Vista de sus cuentas y movimientos.",
    scope: "entity" as const,
    entityNames: ["Danilin", "Danielin"]
  },
  {
    key: "aina",
    label: "Aina",
    description: "Vista de sus cuentas y movimientos.",
    scope: "entity" as const,
    entityNames: ["Aina"]
  },
  {
    key: "cris-bea",
    label: "Cris",
    description: "Vista de sus cuentas y movimientos.",
    scope: "entity" as const,
    entityNames: ["Cris Bea", "Cris", "Bea"]
  },
  {
    key: "taller",
    label: "Taller",
    description: "Vista de sus cuentas y movimientos.",
    scope: "entity" as const,
    entityNames: ["Taller"]
  }
];

type TestBankAccount = {
  id: string;
  name: string;
  active: boolean;
};

export function isTestUserSelectorEnabled() {
  const setting = process.env.ENABLE_TEST_USER_SELECTOR;

  if (setting === "true") {
    return true;
  }

  if (setting === "false") {
    return false;
  }

  return true;
}

export async function listTestUserViews() {
  const { workspace, entities } = await listEconomicEntities();
  const supabase = await createClient();
  const entitiesByName = new Map(entities.map((entity) => [normalizeName(entity.name), entity]));
  const tallerEntity = entitiesByName.get("taller") ?? null;

  const baseViews = testUsers.map<TestUserView>((testUser) => {
      const entity =
        testUser.entityNames.map((name) => entitiesByName.get(normalizeName(name))).find(Boolean) ?? null;

      return {
        key: testUser.key,
        label: testUser.label,
        description: testUser.description,
        href:
          testUser.scope === "all"
            ? "/entities"
            : entity
              ? `/entities/${entity.id}?mode=personal`
              : "/entities",
        scope: testUser.scope,
        entity
      };
    });

  let tallerAccountViews: TestUserView[] = [];

  if (tallerEntity) {
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("id, name, active")
      .eq("workspace_id", workspace.id)
      .eq("economic_entity_id", tallerEntity.id)
      .order("active", { ascending: false })
      .order("name", { ascending: true })
      .returns<TestBankAccount[]>();

    if (error) {
      throw new Error(`No se pudieron cargar las cuentas de Taller: ${error.message}`);
    }

    tallerAccountViews = data.map((account) => ({
      key: `taller-account-${account.id}`,
      label: account.name,
      description: "Vista directa de esta cuenta de Taller.",
      href: `/entities/${tallerEntity.id}/accounts/${account.id}?mode=personal`,
      scope: "account" as const,
      entity: tallerEntity,
      accountName: account.name
    }));
  }

  return {
    workspace,
    views: [...baseViews, ...tallerAccountViews]
  };
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
