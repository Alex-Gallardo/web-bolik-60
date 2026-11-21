// @vitest-environment node
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// El entorno lo decide cada prueba; las fuentes de next/font no cargan fuera de Next. Sin sesión
// de admin (BD-114): la decisión que lee la cookie se simula.
const env = { APP_ENV: "development" as "development" | "staging" | "production" };
const session = { valid: false };
vi.mock("@/env", () => ({ env }));
vi.mock("@/app/fonts", () => ({ baloo: { variable: "font-baloo" } }));
vi.mock("@/server/auth/guards", () => ({ hasAdminSession: async () => session.valid }));

const { default: StyleguideLayout } = await import("./layout");

/** El componente que decide (dentro del <Suspense>), para correrlo como lo haría React. */
function gate(): ReactElement<{ children: ReactNode }> & {
  type: (props: { children: ReactNode }) => Promise<ReactNode>;
} {
  const root = StyleguideLayout({ children: "contenido" }) as ReactElement<{ children: ReactNode }>;
  const suspense = root.props.children as ReactElement<{ children: ReactNode }>;
  const inner = suspense.props.children;
  if (!isValidElement(inner)) throw new Error("sin gate");
  return inner as never;
}

const run = () => {
  const element = gate();
  return element.type(element.props);
};

afterEach(() => {
  env.APP_ENV = "development";
  session.valid = false;
});

describe("layout de /styleguide (BD-026, BD-114)", () => {
  it("en producción, sin sesión de admin, lanza notFound (el 404 real lo da proxy.ts sin cookie)", async () => {
    env.APP_ENV = "production";
    await expect(run()).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("en producción, con sesión de admin, se muestra", async () => {
    env.APP_ENV = "production";
    session.valid = true;
    await expect(run()).resolves.toBe("contenido");
  });

  it("en desarrollo y staging se muestra directo, sin Suspense ni sesión (se ve sin JS)", () => {
    for (const appEnv of ["development", "staging"] as const) {
      env.APP_ENV = appEnv;
      const root = StyleguideLayout({ children: "contenido" }) as ReactElement<{
        children: ReactNode;
      }>;
      expect(root.props.children).toBe("contenido");
    }
  });
});
