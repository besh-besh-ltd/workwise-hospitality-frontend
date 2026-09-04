// ESLint — deliberately minimal, and here for one reason.
//
// WHY THIS EXISTS
// A negotiation-round P0 (2026-08-14) took the create-round page down with
//
//     ReferenceError: parseLocalDateTimeInput is not defined
//
// A helper was rewritten to call that function and the import was never added.
// Three separate checks should have caught it and none did: no test called the
// helper; the module's own guard test PASSED (it bans bare `moment(`/`new Date(`,
// and the change satisfied that rule while being broken — it checks WHICH parser
// you call, not whether the parser EXISTS); and the repo had no ESLint config at
// all, so `no-undef` — which catches the entire class in under a second — had
// never run.
//
// WHY IT IS SO SMALL
// This repo is large and predates any linting. Turning on `next/core-web-vitals`
// would emit thousands of findings, CI would be red on day one, and the rule
// everyone actually needs would drown. A lint nobody can keep green guards
// nothing — which is exactly the failure mode this file is a response to.
//
// So: only rules that flag things that are WRONG, never style, never taste.
// Every rule below is one a reviewer would stop a PR for. Growing the set later
// is easy; recovering from a red-forever pipeline is not.

import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    // Build output, deps, and generated assets are not ours to lint.
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "public/**",
      "next.config.*",
    ],
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    // Registered, but every rule left OFF. The codebase already carries
    // `// eslint-disable-next-line react-hooks/exhaustive-deps` comments, and
    // ESLint 9 errors on a disable directive naming a rule it cannot resolve
    // ("Definition for rule ... was not found") — 72 of them. Declaring the
    // plugin makes those directives valid without switching on an opinionated
    // rule this pass is deliberately not taking on.
    plugins: { "react-hooks": reactHooks },
    linterOptions: {
      // The codebase carries ~78 `// eslint-disable-next-line no-unused-vars`
      // comments. This pass does not enable `no-unused-vars` (it is noisy on a
      // codebase this size), so ESLint would report every one of those as an
      // unused directive — 78 warnings that mean nothing. Re-enable this when
      // the rule set grows to cover them.
      reportUnusedDisableDirectives: "off",
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: {
        // JSX only needs the syntax flag; no React plugin is required for the
        // rules below, and adding one would pull in a large opinionated set.
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        // Next.js injects these; without them `no-undef` misfires on real code.
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      // ── THE RULE THIS FILE EXISTS FOR ────────────────────────────────────
      // Calling something that is not imported or defined. The P0 above, and
      // the only class of bug that is invisible to every other check we have.
      "no-undef": "error",

      // ── Free correctness wins: each is a guaranteed runtime or logic fault,
      //    none can fire on legitimate code, so none can become noise. ──────
      "no-const-assign": "error",      // TypeError at runtime
      "no-dupe-keys": "error",         // a silently discarded object key
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-unsafe-negation": "error",   // `!a in b` — reads as intent, is not
      "no-obj-calls": "error",         // `Math()` — always a TypeError
      "no-unreachable": "error",       // code after return/throw
      "no-func-assign": "error",
      "no-import-assign": "error",
      "no-setter-return": "error",
      "no-compare-neg-zero": "error",
      "use-isnan": "error",            // `x === NaN` is always false
      "valid-typeof": "error",         // `typeof x === "strng"`
    },
  },
  {
    // Tests run in jsdom under Jest and legitimately use its globals.
    files: ["**/*.test.{js,jsx}", "**/__tests__/**", "jest.setup.js"],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
  },
  {
    // Service workers get their own global scope.
    files: ["**/sw.js", "**/service-worker.js", "public/**/*.js"],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },
];
