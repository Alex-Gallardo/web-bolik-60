import "server-only";
import { env } from "@/env";
import type { ContactRequest } from "@/features/contact/schema";
import type { DistributorRequest } from "@/features/distributors/schema";
import type { SchoolVisit } from "@/features/schools/schema";
import { folioYear, formatFolio, type FolioPrefix } from "@/lib/folio";
import { log } from "@/server/log";

/**
 * Guardar las solicitudes de escuelas, distribuidores y contacto (BD-076) y contar las recientes de
 * una IP o de un correo. Con DATA_SOURCE=db, en SQL Server: escuelas y distribuidores con su folio
 * (ESC, DIS) en la misma transacción (BD-033). Con `fixtures` (desarrollo y CI, sin base), en
 * memoria con su propio consecutivo, como la cotización (`quote-requests.ts`).
 */

export type RequestForm = "school" | "distributor" | "contact";

/** persisted: quedó en SQL Server (con fixtures, en memoria). folio: null en contacto. */
export type SavedRequest = { id: number; folio: string | null; persisted: boolean };

/** Límite de envíos por hash de IP (docs/03 §8). */
export type IpLimit = { max: number; windowMs: number };

/** Ya hay `max` solicitudes de esta IP en la ventana: la transacción se revierte. */
export class RequestRateLimitError extends Error {
  constructor() {
    super("Límite de solicitudes por IP");
    this.name = "RequestRateLimitError";
  }
}

type Data = { school: SchoolVisit; distributor: DistributorRequest; contact: ContactRequest };
export type NewRequest<F extends RequestForm> = { data: Data[F]; ipHash: string };

const PREFIX = { school: "ESC", distributor: "DIS", contact: null } as const satisfies Record<
  RequestForm,
  FolioPrefix | null
>;

async function getDb() {
  if (env.DATA_SOURCE !== "db") return null;
  return (await import("@/server/db")).db;
}

// ── Sin base (fixtures): en memoria, con su propio consecutivo por año ──
// Solo lo que se cuenta (IP, correo, fecha): los datos de contacto no se guardan en memoria.
type MemoryRequest = SavedRequest & { ipHash: string; email: string | null; createdAt: number };
const memory = globalThis as unknown as {
  bolikRequests?: Partial<Record<RequestForm, MemoryRequest[]>>;
  /** Último número por prefijo y año ("ESC-2027"): no se repite aunque se olviden las viejas. */
  bolikRequestFolios?: Record<string, number>;
  bolikRequestIds?: Partial<Record<RequestForm, number>>;
};
const memoryRequests = (form: RequestForm) => ((memory.bolikRequests ??= {})[form] ??= []);
/** Tope en memoria por formulario: una sesión larga de desarrollo no acumula datos sin fin. */
const MEMORY_MAX = 500;

/** Solo para pruebas: vacía las solicitudes en memoria. */
export function resetMemoryRequests() {
  memory.bolikRequests = {};
  memory.bolikRequestFolios = {};
  memory.bolikRequestIds = {};
}

function saveInMemory<F extends RequestForm>(
  form: F,
  input: NewRequest<F>,
  limit: IpLimit,
  now: Date,
): SavedRequest {
  const since = now.getTime() - limit.windowMs;
  const list = memoryRequests(form);
  // En memoria no hay carreras (un solo hilo): contar y guardar van seguidos.
  if (list.filter((r) => r.ipHash === input.ipHash && r.createdAt >= since).length >= limit.max)
    throw new RequestRateLimitError();
  const prefix = PREFIX[form];
  const year = folioYear(now);
  const folios = (memory.bolikRequestFolios ??= {});
  const ids = (memory.bolikRequestIds ??= {});
  const key = `${prefix}-${year}`;
  const folio = prefix ? formatFolio(prefix, year, (folios[key] = (folios[key] ?? 0) + 1)) : null;
  const saved = { id: (ids[form] = (ids[form] ?? 0) + 1), folio, persisted: false };
  if (list.length >= MEMORY_MAX) list.shift();
  list.push({
    ...saved,
    ipHash: input.ipHash,
    email: input.data.email?.toLowerCase() ?? null,
    createdAt: now.getTime(),
  });
  log.info({ form, folio }, "Solicitud guardada en memoria (DATA_SOURCE=fixtures)");
  return saved;
}

/**
 * Guarda la solicitud de visita con su folio `ESC-AAAA-NNNNNN`. El folio se pide al principio de la
 * transacción (su bloqueo pone en fila a las solicitudes) y el límite por IP se cuenta después: dos
 * envíos simultáneos de la misma IP no ven el mismo recuento. Sin correo adentro (va en after()).
 */
export async function saveSchoolVisit(
  input: NewRequest<"school">,
  limit: IpLimit,
  now: Date = new Date(),
): Promise<SavedRequest> {
  const db = await getDb();
  if (!db) return saveInMemory("school", input, limit, now);
  const { data } = input;
  const department = await db.department.findUnique({
    where: { slug: data.department },
    select: { id: true },
  });
  const { nextFolio } = await import("@/server/folio");
  return db.$transaction(
    async (tx) => {
      const folio = await nextFolio(tx, "ESC", now);
      const recent = await tx.schoolVisitRequest.count({
        where: {
          ipHash: input.ipHash,
          createdAt: { gte: new Date(now.getTime() - limit.windowMs) },
        },
      });
      // Lanzar revierte la transacción: el folio no se gasta.
      if (recent >= limit.max) throw new RequestRateLimitError();
      const row = await tx.schoolVisitRequest.create({
        data: {
          folio,
          schoolName: data.schoolName,
          level: data.level,
          studentsApprox: data.students ?? null,
          departmentId: department?.id ?? null,
          municipality: data.municipality,
          contactName: data.name,
          phone: data.phone ?? null,
          email: data.email ?? null,
          preferredMonth: data.preferredMonth ?? null,
          ipHash: input.ipHash,
        },
        select: { id: true, folio: true },
      });
      return { ...row, persisted: true };
    },
    { maxWait: 5_000, timeout: 10_000 },
  );
}

/** Guarda la solicitud de distribuidor con su folio `DIS-AAAA-NNNNNN` (como saveSchoolVisit). */
export async function saveDistributorApplication(
  input: NewRequest<"distributor">,
  limit: IpLimit,
  now: Date = new Date(),
): Promise<SavedRequest> {
  const db = await getDb();
  if (!db) return saveInMemory("distributor", input, limit, now);
  const { data } = input;
  const department = await db.department.findUnique({
    where: { slug: data.department },
    select: { id: true },
  });
  const { nextFolio } = await import("@/server/folio");
  return db.$transaction(
    async (tx) => {
      const folio = await nextFolio(tx, "DIS", now);
      const recent = await tx.distributorApplication.count({
        where: {
          ipHash: input.ipHash,
          createdAt: { gte: new Date(now.getTime() - limit.windowMs) },
        },
      });
      if (recent >= limit.max) throw new RequestRateLimitError();
      const row = await tx.distributorApplication.create({
        data: {
          folio,
          businessName: data.businessName,
          businessType: data.businessType,
          nit: data.nit ?? null,
          departmentId: department?.id ?? null,
          municipality: data.municipality,
          contactName: data.name,
          phone: data.phone ?? null,
          email: data.email ?? null,
          ipHash: input.ipHash,
        },
        select: { id: true, folio: true },
      });
      return { ...row, persisted: true };
    },
    { maxWait: 5_000, timeout: 10_000 },
  );
}

/**
 * Guarda el mensaje de contacto (sin folio). Sin el contador de folios que ponga en fila a los
 * envíos, la transacción toma un bloqueo de aplicación por hash de IP (sp_getapplock, liberado en el
 * commit) antes de contar: dos envíos simultáneos de la misma IP no ven el mismo recuento, aun tras
 * un reinicio o con más de un proceso. Un bloqueo de rango (UPDLOCK, HOLDLOCK) con inserciones
 * simultáneas acababa en interbloqueos (RangeS-U contra RangeI-N).
 */
export async function saveContactMessage(
  input: NewRequest<"contact">,
  limit: IpLimit,
  now: Date = new Date(),
): Promise<SavedRequest> {
  const db = await getDb();
  if (!db) return saveInMemory("contact", input, limit, now);
  const { data } = input;
  const since = new Date(now.getTime() - limit.windowMs);
  return db.$transaction(
    async (tx) => {
      const [lock] = await tx.$queryRaw<{ result: number }[]>`
        DECLARE @result INT;
        EXEC @result = sp_getapplock @Resource = ${`BolikContact:${input.ipHash}`},
          @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000;
        SELECT @result AS result;`;
      if ((lock?.result ?? -1) < 0) throw new Error("sp_getapplock no obtuvo el bloqueo");
      const [row] = await tx.$queryRaw<{ recent: number }[]>`
        SELECT COUNT(*) AS recent FROM ContactMessage
        WHERE ipHash = ${input.ipHash} AND createdAt >= ${since};`;
      if ((row?.recent ?? 0) >= limit.max) throw new RequestRateLimitError();
      const created = await tx.contactMessage.create({
        data: {
          name: data.name,
          email: data.email ?? null,
          phone: data.phone ?? null,
          subject: data.subject,
          message: data.message,
          ipHash: input.ipHash,
        },
        select: { id: true },
      });
      return { id: created.id, folio: null, persisted: true };
    },
    { maxWait: 5_000, timeout: 10_000 },
  );
}

/** Solicitudes de este formulario y hash de IP desde `since` (límite de envíos, docs/03 §8). */
export async function countRecentRequestsByIp(
  form: RequestForm,
  ipHash: string,
  since: Date,
): Promise<number> {
  const db = await getDb();
  if (!db)
    return memoryRequests(form).filter((r) => r.ipHash === ipHash && r.createdAt >= since.getTime())
      .length;
  const where = { ipHash, createdAt: { gte: since } };
  if (form === "school") return db.schoolVisitRequest.count({ where });
  if (form === "distributor") return db.distributorApplication.count({ where });
  return db.contactMessage.count({ where });
}

/**
 * Solicitudes de este formulario con este correo desde `since`: el acuse no debe servir para mandar
 * correos a cualquier dirección desde web@bolik66.com (como `countRecentQuotesByEmail`).
 */
export async function countRecentRequestsByEmail(
  form: RequestForm,
  email: string,
  since: Date,
): Promise<number> {
  const db = await getDb();
  const wanted = email.toLowerCase();
  if (!db)
    return memoryRequests(form).filter((r) => r.email === wanted && r.createdAt >= since.getTime())
      .length;
  const where = { email: wanted, createdAt: { gte: since } };
  if (form === "school") return db.schoolVisitRequest.count({ where });
  if (form === "distributor") return db.distributorApplication.count({ where });
  return db.contactMessage.count({ where });
}
