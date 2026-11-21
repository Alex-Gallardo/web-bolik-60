// pnpm admin:create [--remoto] (BD-114, ADR-08): crea un usuario del admin. Pide correo, nombre,
// rol (admin | editor | ventas) y la contraseña sin mostrarla (12 caracteres o más, hasta 72
// bytes, el tope de bcrypt). Si el correo ya existe no lo cambia: para desbloquear o cambiar una
// contraseña está /admin/usuarios (BD-124). Lee los .env como `next dev` (DATABASE_URL).
// Como import:media, por defecto solo corre contra una base de desarrollo o de pruebas
// (…_Dev, …_Test); para staging o producción se corre en ese servidor con --remoto.
// La contraseña nunca se imprime ni queda en el historial de la terminal.
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import nextEnv from "@next/env";
import { PrismaMssql } from "@prisma/adapter-mssql";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { BCRYPT_COST } from "../src/lib/admin-access";
import { ROLES } from "../src/lib/constants";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
  info: () => {},
  error: console.error,
});

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const args = (() => {
  try {
    return parseArgs({ options: { remoto: { type: "boolean", default: false } }, strict: true });
  } catch (error) {
    fail(
      `Argumento no reconocido (${(error as Error).message}). Uso: pnpm admin:create [--remoto].`,
    );
  }
})();

const userSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(160)),
  name: z.string().trim().min(1).max(120),
  role: z.enum(ROLES),
  password: z
    .string()
    .min(12)
    .refine((p) => Buffer.byteLength(p) <= 72),
});

/** Lee una línea sin mostrar lo que se escribe (la contraseña). */
async function askHidden(question: string): Promise<string> {
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          stdin.setRawMode(false);
          stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

// Sin terminal (entrada redirigida) no se puede pedir la contraseña sin mostrarla.
if (!stdin.isTTY) fail("Córrelo en una terminal interactiva: la contraseña se pide sin mostrarla.");

const url = process.env.DATABASE_URL;
if (!url) fail("Falta DATABASE_URL.");

const db = new PrismaClient({ adapter: new PrismaMssql(url) });
try {
  const [row] = await db.$queryRaw<{ name: string }[]>`SELECT DB_NAME() AS name`;
  const database = row?.name ?? "";
  const appEnv = process.env.APP_ENV ?? "development";
  const local = appEnv === "development" && /_(dev|test)$/i.test(database);
  if (!local && !args.values.remoto)
    fail(
      `La base «${database}» (APP_ENV=${appEnv}) no es de desarrollo. Córrelo en ese servidor y agrega --remoto.`,
    );

  console.log(`Nuevo usuario del admin en la base ${database}.`);
  const rl = createInterface({ input: stdin, output: stdout });
  const email = await rl.question("Correo: ");
  const name = await rl.question("Nombre: ");
  const role = await rl.question(`Rol (${ROLES.join(" | ")}): `);
  rl.close();
  const password = await askHidden("Contraseña (no se muestra): ");
  const again = await askHidden("Repítela: ");
  if (password !== again) fail("Las contraseñas no coinciden.");

  const parsed = userSchema.safeParse({ email, name, role: role.trim(), password });
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    fail(
      `Revisa: ${fields.join(", ")}. El correo debe ser válido, el rol uno de ${ROLES.join(", ")} y la contraseña tener entre 12 caracteres y 72 bytes.`,
    );
  }
  const user = parsed.data;
  if (await db.adminUser.findUnique({ where: { email: user.email } }))
    fail(`Ya existe un usuario con ${user.email}: no se cambió.`);
  const created = await db.adminUser.create({
    data: {
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash: await bcrypt.hash(user.password, BCRYPT_COST),
    },
    select: { id: true },
  });
  await db.auditLog.create({
    data: {
      action: "create",
      entity: "AdminUser",
      entityId: String(created.id),
      diff: JSON.stringify({ email: user.email, role: user.role, origen: "admin:create" }),
    },
  });
  console.log(`✔ Usuario ${user.email} (${user.role}) creado.`);
} catch (error) {
  const code = (error as { code?: unknown }).code;
  // Sin el mensaje completo de Prisma: copia los argumentos de la consulta (el hash).
  fail(`No se pudo crear el usuario${typeof code === "string" ? ` (${code})` : ""}.`);
} finally {
  await db.$disconnect();
}
