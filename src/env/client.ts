import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    VITE_DEV: z.boolean().default(false),
    VITE_PROD: z.boolean().default(false),
    VITE_SSR: z.boolean().default(false),
  },
  runtimeEnv: import.meta.env,
});
