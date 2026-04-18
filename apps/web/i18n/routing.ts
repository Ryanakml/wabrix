import { defineRouting } from "next-intl/routing";
import { defaultLocale, supportedLocales } from "@wabrix/config";

export const routing = defineRouting({
  locales: supportedLocales,
  defaultLocale,
});
