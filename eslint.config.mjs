import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Canonical public release ignores:
    "atlas-platform/**",
    "output/**",
    ".playwright-cli/**",
    ".playwright-mcp/**",
    "coverage/**",
    "playwright-report/**",
    "blob-report/**",
    "k6/**",
  ]),
  {
    files: ["src/lib/jarvis/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
