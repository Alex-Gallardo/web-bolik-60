import { CategoryCard } from "@/components/catalog/category-card";
import { ProductCard } from "@/components/catalog/product-card";
import { AudienceCard } from "@/components/home/audience-card";
import { StoreCard } from "@/components/stores/store-card";
import { Badge } from "@/components/ui/badge";
import { Chip, ChipToggle } from "@/components/ui/chip";
import { audiences } from "@/content/home";
import type { CategoryView, ProductCardView, StoreView } from "@/server/data/types";
import { Pending } from "../_components/pending";
import { SgSection } from "../_components/sg-section";

type CardsSectionProps = {
  products: ProductCardView[];
  categories: CategoryView[];
  stores: StoreView[];
};

/** 8 · Tarjetas: producto, categoría, solución (por público), tienda, badges y chips. */
export function CardsSection({ products, categories, stores }: CardsSectionProps) {
  return (
    <SgSection
      id="tarjetas"
      intro="Toda la tarjeta es un solo enlace (salvo la de tienda, que tiene varias acciones)."
    >
      <h3>Productos (grilla de 12)</h3>
      <ul
        data-testid="grilla-productos"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4"
      >
        {products.slice(0, 12).map((product) => (
          <li key={product.slug}>
            {/* Sin prefetch: las fichas, categorías y páginas por público llegan en S2. */}
            <ProductCard product={product} headingLevel={4} prefetch={false} />
          </li>
        ))}
      </ul>
      <h3>Categorías</h3>
      <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {categories.map((category) => (
          <li key={category.slug}>
            <CategoryCard category={category} headingLevel={4} prefetch={false} />
          </li>
        ))}
      </ul>
      <h3>Soluciones por público</h3>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {audiences.map((audience) => (
          <li key={audience.title}>
            <AudienceCard {...audience} headingLevel={4} prefetch={false} />
          </li>
        ))}
      </ul>
      <h3>Tiendas</h3>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stores.slice(0, 3).map((store) => (
          <li key={store.slug}>
            <StoreCard store={store} headingLevel={4} />
          </li>
        ))}
      </ul>
      <h3>Kits e infantil</h3>
      <Pending what="KitCard" ticket="BD-108" />
      <Pending what="Tarjeta infantil (escuelas)" ticket="BD-105" />
      <h3>Badges y chips</h3>
      <div className="flex flex-wrap items-center gap-3">
        <Badge>Nueva</Badge>
        <Badge tone="info">En proceso</Badge>
        <Badge tone="success">Ganada</Badge>
        <Badge tone="warning">Pendiente</Badge>
        <Badge tone="danger">Perdida</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Chip line="escritura">Escritura</Chip>
        <Chip line="escolar">Escolar</Chip>
        <Chip line="arte">Arte</Chip>
        <Chip line="oficina">Oficina</Chip>
        <ChipToggle line="escolar" pressed>
          Escolar
        </ChipToggle>
        <ChipToggle line="oficina" pressed={false}>
          Oficina
        </ChipToggle>
      </div>
    </SgSection>
  );
}
