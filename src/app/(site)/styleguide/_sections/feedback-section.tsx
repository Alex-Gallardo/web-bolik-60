import { ProductCardSkeleton } from "@/components/catalog/product-card-skeleton";
import { ui } from "@/content/ui";
import { SgSection } from "../_components/sg-section";
import { FeedbackDemo } from "../_demos/feedback-demo";

type FeedbackSectionProps = { productName: string; storeName: string };

/**
 * 10 · Feedback: cada fila de la matriz (docs/08 §4) con su toast, diálogo o estado inline real
 * (estados vacíos e InlineAlert incluidos) y los skeletons de carga.
 */
export function FeedbackSection({ productName, storeName }: FeedbackSectionProps) {
  return (
    <SgSection
      id="feedback"
      intro="Cada acción tiene una respuesta: toast para lo rápido, diálogo para lo importante y mensajes en la página para errores de campo y estados vacíos. Los textos salen de content/feedback.ts."
    >
      <FeedbackDemo productName={productName} storeName={storeName} />
      <h3>Cargando (skeleton)</h3>
      <div aria-busy="true" className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <span className="sr-only">{ui.loading.products}</span>
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </SgSection>
  );
}
