import { economicEntityTypes, type EconomicEntity } from "@/lib/economic-entities";

type EntityFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  entity?: EconomicEntity;
  submitLabel: string;
  showActive?: boolean;
};

const typeLabels: Record<string, string> = {
  person: "Persona",
  household: "Hogar",
  business: "Negocio",
  other: "Otro"
};

export function EntityForm({ action, entity, submitLabel, showActive = false }: EntityFormProps) {
  return (
    <form className="form" action={action}>
      <label className="field">
        <span>Nombre</span>
        <input className="input" type="text" name="name" defaultValue={entity?.name} required />
      </label>

      <label className="field">
        <span>Tipo</span>
        <select className="input" name="type" defaultValue={entity?.type ?? "person"} required>
          {economicEntityTypes.map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>
      </label>

      {showActive ? (
        <label className="check-field">
          <input type="checkbox" name="active" defaultChecked={entity?.active ?? true} />
          <span>Entidad activa</span>
        </label>
      ) : null}

      <button className="button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
