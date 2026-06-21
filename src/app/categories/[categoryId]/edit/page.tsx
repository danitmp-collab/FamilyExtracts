import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/categories";
import { CategoryForm } from "../../category-form";
import { updateCategory } from "../../actions";

type EditCategoryPageProps = {
  params: Promise<{
    categoryId: string;
  }>;
};

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { categoryId } = await params;
  const { category } = await getCategory(categoryId);

  if (!category) {
    notFound();
  }

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <h1>Editar categoria</h1>
            <p className="muted">{category.name}</p>
          </div>

          <Link className="button secondary" href="/categories">
            Volver
          </Link>
        </div>

        <div className="panel">
          <CategoryForm action={updateCategory.bind(null, category.id)} category={category} />
        </div>
      </section>
    </main>
  );
}
