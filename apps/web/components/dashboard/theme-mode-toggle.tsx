"use client";

import * as React from "react";
import { MoonStarIcon, SunMediumIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

export function ThemeModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = React.useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
      const root = document.documentElement;
      const transitionDocument = document as ViewTransitionDocument;

      if (event) {
        root.style.setProperty("--x", `${event.clientX}px`);
        root.style.setProperty("--y", `${event.clientY}px`);
      }

      if (!transitionDocument.startViewTransition) {
        setTheme(nextTheme);
        return;
      }

      transitionDocument.startViewTransition(() => {
        setTheme(nextTheme);
      });
    },
    [resolvedTheme, setTheme],
  );

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="size-9 rounded-xl border-border/70 bg-background/70 backdrop-blur-sm"
      onClick={handleToggle}
    >
      {isDark ? <SunMediumIcon className="size-4" /> : <MoonStarIcon className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
