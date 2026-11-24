import type { ContactSubject, DistributorBusinessType, Month, SchoolLevel } from "@/lib/constants";

/**
 * Textos de los formularios de escuelas, distribuidores y contacto (BD-076, doc 17 §4). Los
 * comunes (nombre, teléfono, correo, departamento) son los mismos de la cotización.
 */

const common = {
  name: "Tu nombre",
  phone: "Teléfono",
  email: "Correo",
  phoneOrEmailHint: "Déjanos al menos uno de los dos.",
  department: "Departamento",
  departmentPlaceholder: "Elige tu departamento",
  municipality: "Municipio",
  optional: "(opcional)",
} as const;

type Option<T extends string> = { value: T; label: string };

export const schoolLevelOptions = [
  { value: "preprimaria", label: "Preprimaria" },
  { value: "primaria", label: "Primaria" },
  { value: "basicos", label: "Básicos" },
  { value: "diversificado", label: "Diversificado" },
] as const satisfies readonly Option<SchoolLevel>[];

export const monthOptions = [
  { value: "enero", label: "Enero" },
  { value: "febrero", label: "Febrero" },
  { value: "marzo", label: "Marzo" },
  { value: "abril", label: "Abril" },
  { value: "mayo", label: "Mayo" },
  { value: "junio", label: "Junio" },
  { value: "julio", label: "Julio" },
  { value: "agosto", label: "Agosto" },
  { value: "septiembre", label: "Septiembre" },
  { value: "octubre", label: "Octubre" },
  { value: "noviembre", label: "Noviembre" },
  { value: "diciembre", label: "Diciembre" },
] as const satisfies readonly Option<Month>[];

export const businessTypeOptions = [
  { value: "libreria", label: "Librería" },
  { value: "tienda", label: "Tienda" },
  { value: "distribuidor", label: "Distribuidor" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly Option<DistributorBusinessType>[];

export const contactSubjectOptions = [
  { value: "productos", label: "Información de productos" },
  { value: "cotizacion", label: "Cotización" },
  { value: "escuelas", label: "Escuelas" },
  { value: "distribucion", label: "Distribución" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly Option<ContactSubject>[];

/** Etiqueta del campo trampa (BD-077): oculta para las personas, la lee un bot. */
export const honeypotLabel = "Sitio web";

/** Nombre visible de una opción (correos a Ventas). */
export const optionLabel = <T extends string>(options: readonly Option<T>[], value: T) =>
  options.find((o) => o.value === value)?.label ?? value;

/** «Lleva Bolik a tu escuela» (doc 17 §4 `/escuelas`). */
export const schoolForm = {
  ...common,
  title: "Lleva Bolik a tu escuela",
  schoolName: "Nombre del colegio",
  level: "Nivel",
  students: "Alumnos aproximados",
  preferredMonth: "Mes preferido",
  monthPlaceholder: "Elige un mes",
  submit: "Enviar solicitud",
  sending: "Enviando tu solicitud…",
} as const;

/** «Quiero ser distribuidor» (doc 17 §4 `/mayoreo`). */
export const distributorForm = {
  ...common,
  title: "Quiero ser distribuidor",
  intro: "¿Tienes una librería, tienda o ruta de distribución? Cuéntanos de tu negocio.",
  businessName: "Nombre del negocio",
  businessType: "Tipo",
  nit: "NIT",
  submit: "Enviar solicitud",
  sending: "Enviando tu solicitud…",
} as const;

/** Formulario de `/contacto` (doc 17 §4). */
export const contactForm = {
  ...common,
  subject: "Asunto",
  subjectPlaceholder: "Elige un asunto",
  message: "Mensaje",
  submit: "Enviar mensaje",
  sending: "Enviando tu mensaje…",
} as const;
