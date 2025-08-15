const tsPlugin = require("@typescript-eslint/eslint-plugin")
const importPlugin = require("eslint-plugin-import")
const prettierPlugin = require("eslint-plugin-prettier")

module.exports = [
  {
    ignores: [
      "**/_godot_defs/**",
      "**/mockProject/**",
      "**/godot_src/**",
      "**/js/**",
      "**/*.js",
      ".eslintrc.js",
      "tsconfig.json",
    ],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        // Add global variables here if needed
        // Example: "process": "readonly"
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "warn",
      "import/first": "error",
      "import/no-duplicates": "error",
      "import/order": ["error", { "newlines-between": "always" }],
      "@typescript-eslint/no-floating-promises": "error",
      // "prefer-const": "off",
      // "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "error",
      // TODO: Enable this rule when the codebase is more stable
      // "@typescript-eslint/no-unsafe-type-assertion": "error"
      // Example: forbid using `startsWith` on strings for tsgd projects
      // "no-restricted-syntax": [
      //     "warn",
      //     {
      //         "selector": "CallExpression[callee.property.name='startsWith']",
      //         "message": "setTimeout must always be invoked with two arguments."
      //     }
      // ]
    }
  },
]
