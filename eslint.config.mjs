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
    // Vendored third-party component source (installed via jsrepo from
    // reactbits.dev) -- not code we authored, so it isn't held to this
    // project's stricter custom rules (react-hooks purity/set-state-in-
    // effect, no-explicit-any). Same convention as excluding a shadcn-style
    // components/ui/ vendor directory.
    "components/react-bits/**",
  ]),
]);

export default eslintConfig;
