import type { Metadata } from "next";
import { listProducts } from "@/server/data/catalog";
import { listStores } from "@/server/data/stores";
import { FeedbackDemo } from "./feedback-demo";

/**
 * Vitrina de la matriz de feedback (docs/08 §4, BD-024): cada acción con su toast, diálogo o
 * estado inline real. BD-026 la integra al /styleguide completo.
 */
export const metadata: Metadata = {
  title: "Feedback · Styleguide",
  robots: { index: false, follow: false },
};

export default async function FeedbackPage() {
  const [products, stores] = await Promise.all([listProducts(), listStores()]);
  return (
    <div className="container-site flex flex-col gap-10 py-16">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-blue">Styleguide</p>
        <h1>Feedback</h1>
        <p className="max-w-[var(--measure)] text-muted">
          Cada acción tiene una respuesta: toast para lo rápido, diálogo para lo importante y
          mensajes en la página para errores de campo y estados vacíos. Los textos salen de
          content/feedback.ts.
        </p>
      </header>
      <section aria-labelledby="matriz" className="flex flex-col gap-6">
        <h2 id="matriz">Matriz de feedback</h2>
        <FeedbackDemo productName={products[0]?.name ?? ""} storeName={stores[0]?.name ?? ""} />
      </section>
    </div>
  );
}
