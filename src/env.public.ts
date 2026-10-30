/**
 * Variables públicas: se incrustan en el JS del cliente al hacer build, por eso cada una se lee con
 * una referencia estática (`process.env.NEXT_PUBLIC_X`, nunca dinámica). Nada secreto aquí.
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "",
  clarityId: process.env.NEXT_PUBLIC_CLARITY_ID ?? "",
} as const;
