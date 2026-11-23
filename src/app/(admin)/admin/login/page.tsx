import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button-variants";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { adminText } from "@/content/admin";
import { feedback } from "@/content/feedback";
import { login } from "@/features/admin/actions";
import {
  ADMIN_PERMISSIONS,
  EXPIRED_PARAM,
  LOGGED_OUT_PARAM,
  LOGIN_ERROR_PARAM,
  NEXT_PARAM,
  loginErrorFrom,
  safeAdminNext,
  type LoginError,
} from "@/lib/admin-access";
import { checkRole } from "@/server/auth/guards";

/** Fuera de buscadores (docs/10 §2) y sin vista previa en redes. */
export const metadata: Metadata = {
  title: { absolute: adminText.title },
  robots: { index: false, follow: false },
};

type Notice = { title: string; body?: string };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const ERRORS: Record<LoginError, Notice> = {
  invalid: { title: feedback.admin.loginInvalid.title },
  locked: feedback.admin.loginLocked,
  unavailable: feedback.admin.loginUnavailable,
};

/** El aviso de error: el correo lo referencia (llega con la página y el foco va al correo). */
const ERROR_ID = "admin-login-error";

const ALERT = "rounded-lg border-2 border-s-4 border-line bg-paper px-4 py-3";

/**
 * /admin/login (BD-114, docs/06 §4): correo y contraseña; bloqueo tras 5 intentos. Un formulario
 * HTML con la Server Action y sin isla de cliente propia: una isla cliente en el admin parte el JS
 * común de las páginas públicas (docs/12 §2). El navegador pide los campos; los errores vuelven en
 * la URL (?error=) sin el correo. Con una sesión válida pasa directo a la ruta pedida. Avisa si la
 * sesión venció o se cerró.
 */
export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = safeAdminNext(first(params[NEXT_PARAM]));
  if ((await checkRole(ADMIN_PERMISSIONS.dashboard)).ok) redirect(next as Route);

  const errorKey = loginErrorFrom(first(params[LOGIN_ERROR_PARAM]));
  const error = errorKey ? ERRORS[errorKey] : null;
  // Solo el título: «tus cambios siguen en el formulario» llega con los formularios del admin.
  const notice: Notice | null = first(params[EXPIRED_PARAM])
    ? { title: feedback.admin.sessionExpired.title }
    : first(params[LOGGED_OUT_PARAM])
      ? { title: feedback.admin.loggedOut.title }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Logo width={160} className="self-start" />
      <h1 className="text-[length:var(--fs-h2)]">{adminText.title}</h1>
      {error ? (
        <div id={ERROR_ID} role="alert" className={`${ALERT} border-s-danger`}>
          <p className="font-bold">{error.title}</p>
          {error.body ? <p className="mt-1 text-sm">{error.body}</p> : null}
        </div>
      ) : notice ? (
        <div role="status" className={`${ALERT} border-s-info`}>
          <p className="font-bold">{notice.title}</p>
          {notice.body ? <p className="mt-1 text-sm">{notice.body}</p> : null}
        </div>
      ) : null}
      <form action={login} className="flex flex-col gap-5">
        <input type="hidden" name={NEXT_PARAM} value={next} />
        <Field id="admin-email" label={adminText.login.email} required>
          <Input
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            maxLength={160}
            autoFocus
            aria-describedby={error ? ERROR_ID : undefined}
          />
        </Field>
        <Field id="admin-password" label={adminText.login.password} required>
          <Input name="password" type="password" autoComplete="current-password" />
        </Field>
        <button type="submit" className={buttonVariants({ block: true })}>
          {adminText.login.submit}
        </button>
      </form>
    </div>
  );
}
