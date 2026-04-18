import { redirect } from "next/navigation";
import { defaultLocale } from "@wabrix/config";

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
