import "server-only";
import { env } from "@/env";
import type { OutboundClickInput } from "@/features/analytics/outbound";

/**
 * Guarda un clic saliente en OutboundClick (BD-083). La tienda, el departamento y la variante se
 * buscan por su slug o SKU. Si el aviso nombra uno que no existe, no se guarda (false): los enlaces
 * del sitio siempre nombran datos reales, y así un aviso inventado no llena el KPI de clics a
 * puntos de venta con destinos falsos. Con DATA_SOURCE=fixtures no hay base: tampoco (false).
 */
export async function recordOutboundClick(click: OutboundClickInput): Promise<boolean> {
  if (env.DATA_SOURCE !== "db") return false;
  const { db } = await import("@/server/db");
  const [store, department, variant] = await Promise.all([
    click.storeSlug
      ? db.store.findUnique({ where: { slug: click.storeSlug }, select: { id: true } })
      : null,
    click.departmentSlug
      ? db.department.findUnique({ where: { slug: click.departmentSlug }, select: { id: true } })
      : null,
    click.sku
      ? db.productVariant.findUnique({ where: { sku: click.sku }, select: { id: true } })
      : null,
  ]);
  if (
    (click.storeSlug && !store) ||
    (click.departmentSlug && !department) ||
    (click.sku && !variant)
  )
    return false;
  await db.outboundClick.create({
    data: {
      kind: click.kind,
      target: click.target,
      storeId: store?.id ?? null,
      departmentId: department?.id ?? null,
      variantId: variant?.id ?? null,
      path: click.path,
      deviceType: click.deviceType,
    },
  });
  return true;
}
