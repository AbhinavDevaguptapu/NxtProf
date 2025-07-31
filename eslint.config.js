import globals from "globals";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";

export default tseslint.config(
  {
    ignores: ["dist", "eslint.config.js"], // Ignoring the config file itself is a good practice
  },
  {
    // Base configuration for all JS/TS files
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ...reactRecommended, // Apply React recommended rules
    languageOptions: {
      ...reactRecommended.languageOptions, // Use React's recommended language options
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "react-hooks": hooksPlugin,
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules, // Enforce Rules of Hooks
      "react/react-in-jsx-scope": "off", // Not needed with modern React/Vite
      "react/jsx-no-target-blank": "off",
      "@typescript-eslint/no-unused-vars": "warn", // Use "warn" instead of "off" to see unused variables
    },
  },
  // Specific overrides for TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      // You can add TypeScript-specific rule overrides here
    },
  }
);