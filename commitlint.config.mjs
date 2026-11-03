// Conventional Commits en español: `tipo(ámbito): resumen [BD-NNN]`.
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    // Los resúmenes en español empiezan en minúscula, pero pueden llevar nombres propios (Next.js, Tailwind).
    "subject-case": [0],
  },
};

export default config;
