"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

export function ThemeModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  const handleThemeToggle = React.useCallback(
    (event?: React.MouseEvent) => {
      const newMode = resolvedTheme === "dark" ? "light" : "dark";
      const root = document.documentElement;
      const transitionDocument = document as TransitionDocument;

      if (!transitionDocument.startViewTransition) {
        setTheme(newMode);
        return;
      }

      if (event) {
        root.style.setProperty("--x", `${event.clientX}px`);
        root.style.setProperty("--y", `${event.clientY}px`);
      }

      transitionDocument.startViewTransition(() => {
        setTheme(newMode);
      });
    },
    [resolvedTheme, setTheme],
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="group/toggle size-8"
          onClick={handleThemeToggle}
        >
          <Icons.brightness />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Toggle theme <Kbd>D D</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
