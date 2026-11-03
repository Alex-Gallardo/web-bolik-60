// pre-commit: corrige y formatea solo los archivos que van en el commit.
const config = {
  "*.{ts,tsx,js,jsx,mjs}": ["eslint --fix --no-warn-ignored", "prettier --write --ignore-unknown"],
  "*.{json,md,css,yml,yaml}": "prettier --write --ignore-unknown",
};

export default config;
