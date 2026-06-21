import Link from "next/link";
import { CategoryForm } from "../category-form";
import { createCategory } from "../actions";

export default function NewCategoryPage() {
  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <h1>Nueva categoria</h1>
            <p className="muted">Crea una categoria manual simple.</p>
          </div>

          <Link className="button secondary" href="/categories">
            Volver
          </Link>
        </div>

        <div className="panel">
          <CategoryForm action={createCategory} />
        </div>
      </section>
    </main>
  );
}
