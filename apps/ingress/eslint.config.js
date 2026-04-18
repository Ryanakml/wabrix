import { honoConfig } from "@wabrix/eslint-config/hono";

export default [
    ...honoConfig,
    {
        ignores: ["dist/**", ".wrangler/**"]
    }
];
