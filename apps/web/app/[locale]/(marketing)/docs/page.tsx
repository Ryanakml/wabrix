import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getMarketingDocSummaries,
  type MarketingDocSlug,
} from "@/lib/marketing-docs";
import { buildMarketingMetadata } from "@/lib/marketing-metadata";

type DocsIndexPageProps = {
  params: Promise<{ locale: "en" | "id" }>;
};

export async function generateMetadata({ params }: DocsIndexPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DocsMarketing.seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/docs",
    title: t("title"),
    description: t("description"),
    keywords: ["WhatsApp docs", "WABA docs", "template approval", "service window"],
  });
}

export default async function DocsIndexPage({ params }: DocsIndexPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DocsMarketing" });
  const docs = getMarketingDocSummaries(locale).map((entry) => ({
    ...entry,
    slug: entry.slug as MarketingDocSlug,
  }));

  return (
    <div className="space-y-8 pb-10 pt-10 sm:pt-14">
      <div className="max-w-3xl space-y-4">
        <Badge className="rounded-full px-4 py-1.5">{t("badge")}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-base leading-8 text-slate-600">{t("description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {docs.map((doc) => (
          <Card
            key={doc.slug}
            className="border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)]"
          >
            <CardHeader>
              <Badge variant="secondary" className="w-fit rounded-full">
                {doc.category}
              </Badge>
              <CardTitle className="text-2xl text-slate-950">{doc.title}</CardTitle>
              <CardDescription className="leading-7 text-slate-600">
                {doc.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{t("cardFootnote")}</p>
            </CardContent>
            <CardFooter className="border-slate-200/70 bg-slate-50/70">
              <Button asChild variant="ghost" className="px-0 text-slate-950 hover:bg-transparent">
                <Link href={`/${locale}/docs/${doc.slug}`}>
                  {t("readMore")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
