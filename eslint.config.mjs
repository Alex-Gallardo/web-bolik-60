import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Motion solo vive en src/components/motion (LazyMotion + m); el resto del sitio anima con CSS.
const motionImports = {
  paths: [
    {
      name: "motion/react",
      message: "Usa los componentes de @/components/motion (LazyMotion + m).",
    },
    { name: "motion", message: "Usa los componentes de @/components/motion (LazyMotion + m)." },
    {
      name: "framer-motion",
      message: "Este proyecto usa Motion (motion/react) desde @/components/motion.",
    },
  ],
  patterns: [
    {
      group: ["motion/*", "!motion/react", "framer-motion/*"],
      message: "Usa los componentes de @/components/motion.",
    },
  ],
};

// La BD solo se toca desde src/server (y migraciones, scripts y pruebas de integración): las
// páginas y componentes leen a través de src/server/data (CLAUDE.md, docs/04).
const dbImports = {
  paths: [
    { name: "@/server/db", message: "Lee datos con las funciones de @/server/data." },
    {
      name: "@prisma/client",
      message: "El cliente generado vive en @/generated/prisma (solo src/server).",
    },
  ],
  patterns: [
    {
      group: [
        "@/generated/*",
        "**/generated/prisma",
        "**/generated/prisma/*",
        "**/server/db",
        "@prisma/*",
      ],
      message: "Prisma solo se usa en src/server; aquí usa @/server/data.",
    },
  ],
};
// no-restricted-imports no revisa import() dinámicos: esta regla los cubre.
const dbDynamicImport = [
  "error",
  {
    selector: "ImportExpression[source.value=/(server\\/db|generated\\/prisma|^@prisma\\/)/]",
    message: "Prisma solo se usa en src/server; aquí usa @/server/data.",
  },
];
const DB_ALLOWED = ["src/server/**", "prisma/**", "scripts/**", "tests/integration/**"];
const MOTION_ALLOWED = ["src/components/motion/**"];

/** Une las restricciones (ESLint no combina dos bloques con la misma regla: el último gana). */
const restrictImports = (...configs) => [
  "error",
  {
    paths: configs.flatMap((c) => c.paths),
    patterns: configs.flatMap((c) => c.patterns),
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: [...MOTION_ALLOWED, ...DB_ALLOWED],
    rules: {
      "no-restricted-imports": restrictImports(motionImports, dbImports),
      "no-restricted-syntax": dbDynamicImport,
    },
  },
  {
    files: DB_ALLOWED,
    rules: { "no-restricted-imports": restrictImports(motionImports) },
  },
  {
    files: MOTION_ALLOWED,
    rules: {
      "no-restricted-imports": restrictImports(dbImports),
      "no-restricted-syntax": dbDynamicImport,
    },
  },
  // process.env solo en los módulos de entorno, la config de Next y los scripts (CLAUDE.md).
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: [
      "src/env.ts",
      "src/env.public.ts",
      "src/instrumentation.ts",
      "src/instrumentation-node.ts",
      "scripts/**",
      "*.config.*",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Usa `env` de @/env (servidor) o `publicEnv` de @/env.public (cliente).",
        },
      ],
    },
  },
  // Fixtures de Playwright: su `use(...)` no es el hook de React.
  {
    files: ["tests/e2e/**", "tests/visual/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reportes generados por las pruebas.
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
    // Cliente de Prisma generado (pnpm install / prisma generate).
    "src/generated/**",
    // Referencias del repo: se adaptan en cada ticket, no forman parte del build.
    "starter/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
