/**
 * Textos del panel administrativo (docs/06 §4, BD-114; aprobados por el usuario, en docs/17 §5).
 * Los mensajes de cada acción viven en feedback.admin.
 */
export const adminText = {
  /** Título de la pestaña y h1 del login. */
  title: "Panel de Bolik",
  login: {
    email: "Correo",
    password: "Contraseña",
    submit: "Entrar",
  },
  /** Inicio provisional del admin hasta el dashboard de BD-115. */
  home: {
    greeting: (name: string) => `Hola, ${name}`,
    logout: "Cerrar sesión",
  },
} as const;
