import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { appDescription, appName } from "@wabrix/config";
import { ConvexClientProvider } from "@/providers/convex-client-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: `${appName} | Phase 1 Foundation`,
    template: `%s | ${appName}`,
  },
  description: appDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>
            {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
