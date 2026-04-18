import { config } from "@wabrix/eslint-config/base";

export default [
  ...config,
  {
    ignores: ["convex/_generated/**", "**/_generated/**"],
  },
];
