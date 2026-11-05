import type {
  BackgroundPreset,
  FAQ_SCOPES,
  LINE_GROUPS,
  PackagingCode,
  STORE_TYPES,
} from "@/lib/constants";

/**
 * Tipos de vista: lo único que reciben las páginas (docs/03 §3, BD-037). Son iguales con la fuente
 * de ejemplo y con SQL Server, así que cambiar DATA_SOURCE no toca ninguna página. Nunca se exponen
 * modelos de Prisma. Solo incluyen lo publicado; lo no verificado se marca o se filtra según el caso.
 */

export type LineGroup = (typeof LINE_GROUPS)[number];

export type CategoryView = {
  slug: string;
  name: string;
  lineGroup: LineGroup;
  shortText: string;
  intro: string | null;
  href: string;
  productCount: number;
};

export type UseTagView = { slug: string; name: string };

export type ColorView = { key: string; name: string; hex: string };

export type VariantView = {
  sku: string;
  barcode: string | null; // null = por confirmar
  color: ColorView;
  isDefault: boolean;
};

/** Imagen ya procesada (BD-034): ruta base del loader, alt real, medidas y blur. */
export type ImageView = {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
};

export type ProductCardView = {
  slug: string;
  name: string;
  href: string;
  category: { slug: string; name: string; lineGroup: LineGroup };
  shortDescription: string;
  colors: ColorView[];
  skus: string[];
  featured: boolean;
  /** Producto de ejemplo (no existe en el catálogo real): nunca llega a producción. */
  sample: boolean;
  /** Imagen principal; null hasta que haya fotos (BD-034): la tarjeta muestra sus colores. */
  image: ImageView | null;
};

export type SpecGroupView = { name: string; items: { label: string; value: string }[] };

export type DimensionView = {
  partKey: string;
  label: string;
  valueMm: number;
  tolerance: string | null;
};

export type PackagingView = {
  code: PackagingCode;
  name: string;
  unitsPerPack: number;
  innerPacks: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightG: number | null;
  isWholesale: boolean;
};

export type BenefitView = { iconKey: string; title: string; text: string | null };

export type ProductView = ProductCardView & {
  tagline: string | null;
  description: string | null;
  keyFacts: string[];
  safetyWarning: string | null;
  variants: VariantView[];
  specs: SpecGroupView[];
  dimensions: DimensionView[];
  packagings: PackagingView[];
  benefits: BenefitView[];
  uses: UseTagView[];
  related: ProductCardView[];
};

export type ProductFilter = { categorySlug?: string; useSlug?: string };

/** Resultado de buscar por SKU o código de barras (acceso por QR, buscador). */
export type VariantMatch = { product: ProductCardView; variant: VariantView };

export type DepartmentView = {
  slug: string;
  name: string;
  country: "GT" | "SV";
  lat: number;
  lng: number;
  href: string;
  storeCount: number;
};

export type StoreView = {
  slug: string;
  name: string;
  type: (typeof STORE_TYPES)[number];
  department: { slug: string; name: string };
  municipality: string | null;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  onlineShopUrl: string | null;
  lat: number | null;
  lng: number | null;
  /** Dirección validada por Ventas. */
  isVerified: boolean;
};

export type StoreFilter = { departmentSlug?: string; onlineOnly?: boolean };

export type FaqView = { key: string; question: string; answer: string };

export type FaqFilter = {
  scope: (typeof FAQ_SCOPES)[number];
  categorySlug?: string;
  productSlug?: string;
};

export type HeroChapterView = {
  key: string;
  label: string;
  hint: string;
  eyebrow: string;
  line: string;
  cta:
    | { kind: "link"; label: string; href: string }
    | { kind: "quote"; label: string; quoteType: "empresa" | "libreria" };
  videoDesktop: string | null;
  videoMobile: string | null;
  posterKey: string | null;
};

export type SiteStatView = {
  key: string;
  value: number;
  prefix: string | null;
  suffix: string | null;
  label: string;
};

export type MilestoneView = { key: string; year: number; title: string; description: string };

export type SchoolActivityView = {
  key: string;
  title: string;
  description: string;
  colorKey: "coral" | "kblue" | "kgreen" | "paper";
  iconKey: string;
  /** Texto de ejemplo de la demo, sin validar: nunca llega a producción. */
  sample: boolean;
};

export type SectionAppearanceView = { backgroundPreset: BackgroundPreset; tone: "light" | "dark" };

export type KitView = {
  slug: string;
  name: string;
  level: "preprimaria" | "primaria" | "basicos" | "diversificado";
  season: number;
  description: string;
  /** Solo si Mercadeo aprobó mostrar el precio (priceVisible). */
  suggestedPrice: number | null;
  items: { description: string; quantity: number }[];
  /** Kit de ejemplo de la demo: nunca llega a producción. */
  sample: boolean;
};

export type SiteSettings = {
  phone: string;
  address: string;
  businessHours: string;
  legalName: string;
  /** null mientras no haya número: los botones de WhatsApp no se muestran. */
  whatsappNumber: string | null;
  splashEnabled: boolean;
  kitsEnabled: boolean;
  minCustomOrder: number | null;
};

/**
 * Lo que debe ofrecer cada fuente (fixtures hoy, Prisma en BD-032). Las páginas no la usan
 * directo: pasan por las funciones cacheadas de src/server/data/*.ts.
 */
export type DataSource = {
  listCategories(): Promise<CategoryView[]>;
  getCategory(slug: string): Promise<CategoryView | null>;
  listUseTags(): Promise<UseTagView[]>;
  listProducts(filter?: ProductFilter): Promise<ProductCardView[]>;
  getProduct(categorySlug: string, slug: string): Promise<ProductView | null>;
  getFeaturedProduct(): Promise<ProductView | null>;
  /** Todas las variantes visibles con su producto: índice para buscar por código en memoria. */
  listVariantMatches(): Promise<VariantMatch[]>;
  listDepartments(): Promise<DepartmentView[]>;
  getDepartment(slug: string): Promise<DepartmentView | null>;
  listStores(filter?: StoreFilter): Promise<StoreView[]>;
  listFaqs(filter: FaqFilter): Promise<FaqView[]>;
  listHeroChapters(): Promise<HeroChapterView[]>;
  listSiteStats(): Promise<SiteStatView[]>;
  listMilestones(): Promise<MilestoneView[]>;
  listSchoolActivities(): Promise<SchoolActivityView[]>;
  getSectionAppearance(sectionKey: string): Promise<SectionAppearanceView | null>;
  listKits(): Promise<KitView[]>;
  getSiteSettings(): Promise<SiteSettings>;
};
