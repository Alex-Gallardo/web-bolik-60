import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { adminText } from "@/content/admin";
import { feedback } from "@/content/feedback";
import { logout } from "@/features/admin/actions";
import { ADMIN_PERMISSIONS, DENIED_PARAM } from "@/lib/admin-access";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: { absolute: adminText.title },
  robots: { index: false, follow: false },
};

/**
 * Inicio del admin (BD-114): provisional hasta el dashboard y el menú de BD-115. Saluda al
 * usuario y deja cerrar sesión. Si llega desde una sección sin permiso, lo avisa.
 */
export default async function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  const user = await requireRole(...ADMIN_PERMISSIONS.dashboard);
  const denied = Boolean((await searchParams)[DENIED_PARAM]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      {denied ? (
        <p
          role="status"
          className="rounded-lg border-2 border-s-4 border-line border-s-warning bg-paper px-4 py-3 font-bold"
        >
          {feedback.admin.forbidden.title}
        </p>
      ) : null}
      <h1 className="text-[length:var(--fs-h2)]">{adminText.home.greeting(user.name)}</h1>
      <form action={logout}>
        <Button type="submit" variant="outline">
          {adminText.home.logout}
        </Button>
      </form>
    </div>
  );
}
