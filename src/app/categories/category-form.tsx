import type { Category } from "@/lib/categories";
import { categoryTypes, getCategoryTypeLabel } from "@/lib/categories";

type CategoryFormProps = {
  action: (formData: FormData) => Promise<void>;
  category?: Category;
};

export function CategoryForm({ action, category }: CategoryFormProps) {
  return (
    <form className="form" action={action}>
      <label className="field">
        <span>Nombre</span>
        <input className="input" type="text" name="name" defaultValue={category?.name ?? ""} required />
      </label>

      <label className="field">
        <span>Tipo</span>
        <select className="input" name="type" defaultValue={category?.type ?? "neutral"} required>
          {categoryTypes.map((type) => (
            <option key={type} value={type}>
              {getCategoryTypeLabel(type)}
            </option>
          ))}
        </select>
      </label>

      {category ? (
        <label className="check-field">
          <input type="checkbox" name="active" defaultChecked={category.active} />
          <span>Activa</span>
        </label>
      ) : null}

      <button className="button" type="submit">
        Guardar categoria
      </button>
    </form>
  );
}
