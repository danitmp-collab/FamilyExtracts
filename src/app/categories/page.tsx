import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { getCategoryTypeLabel, listCategories } from "@/lib/categories";
import { deactivateCategory } from "./actions";

export default async function CategoriesPage() {
  const { workspace, categories } = await listCategories();
  if (workspace.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>Categorias</h1>
            <p className="muted">Categorias manuales opcionales para movimientos.</p>
          </div>

          <div className="actions">
            <Link className="button secondary finance-ghost-action" href="/dashboard">
              Dashboard
            </Link>
            <Link className="button" href="/categories/new">
              Nueva categoria
            </Link>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          {categories.length === 0 ? (
            <p className="muted">Todavia no hay categorias.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td data-label="Nombre">
                        <strong className="table-card-title">{category.name}</strong>
                      </td>
                      <td data-label="Tipo">{getCategoryTypeLabel(category.type)}</td>
                      <td data-label="Estado">
                        <span className={`status ${category.active ? "active" : "inactive"}`}>
                          {category.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <div className="actions">
                          <Link className="text-link" href={`/categories/${category.id}/edit`}>
                            Editar
                          </Link>
                          {category.active ? (
                            <form action={deactivateCategory.bind(null, category.id)}>
                              <button className="link-button danger" type="submit">
                                Desactivar
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <MobileBottomNav active="settings" />
      </section>
    </main>
  );
}
