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

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: ["src/components/motion/**"],
    rules: { "no-restricted-imports": ["error", motionImports] },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Referencias del repo: se adaptan en cada ticket, no forman parte del build.
    "starter/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
