import { ImageResponse } from "next/og";
import { appName } from "@wabrix/config";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.35), transparent 24%), radial-gradient(circle at top right, rgba(168,85,247,0.28), transparent 20%), linear-gradient(180deg, #0b1020 0%, #111827 100%)",
          color: "white",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            padding: 48,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                fontSize: 24,
                opacity: 0.72,
                letterSpacing: 1,
              }}
            >
              WhatsApp AI SaaS
            </div>
            <div
              style={{
                fontSize: 72,
                lineHeight: 1.05,
                fontWeight: 700,
                maxWidth: 900,
              }}
            >
              {`${appName} turns WhatsApp into a reliable revenue workflow.`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 24,
              opacity: 0.88,
            }}
          >
            <span>Inbox</span>
            <span>Automation</span>
            <span>Templates</span>
            <span>Billing</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
