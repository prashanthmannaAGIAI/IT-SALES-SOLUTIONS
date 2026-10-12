import astro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**"],
  },
  ...astro.configs["flat/recommended"],
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
];
