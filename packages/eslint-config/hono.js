import globals from "globals";
import { config as baseConfig } from "./base.js";

export const honoConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
];
