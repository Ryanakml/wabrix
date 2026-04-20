import { Hono } from "hono";
import { phaseLabel } from "@wabrix/config";

type Bindings = {
  CONVEX_HTTP_URL?: string;
  CONVEX_SHARED_SECRET?: string;
  ENVIRONMENT?: string;
  META_APP_SECRET?: string;
  META_VERIFY_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.json({
    ok: true,
    service: "ingress",
    environment: c.env.ENVIRONMENT ?? "local",
    phase: phaseLabel,
  });
});

app.get("/health", (c) => {
  return c.json({
    ok: true,
    transport: "cloudflare-worker",
    phase: phaseLabel,
  });
});

app.get("/webhooks/whatsapp", (c) => {
  return c.json(
    {
      ok: false,
      phase: phaseLabel,
      status: "not_implemented",
      message: "Webhook verification is scheduled for phase 6.",
    },
    501,
  );
});

app.post("/webhooks/whatsapp", (c) => {
  return c.json(
    {
      ok: false,
      phase: phaseLabel,
      status: "not_implemented",
      message: "Raw webhook event durability is scheduled for phase 6.",
    },
    501,
  );
});

export default app;
