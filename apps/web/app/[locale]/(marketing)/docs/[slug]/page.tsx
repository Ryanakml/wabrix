import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getMarketingDocContent,
  getMarketingDocMeta,
  getMarketingDocSummaries,
  isMarketingDocSlug,
} from "@/lib/marketing-docs";
import { buildMarketingMetadata } from "@/lib/marketing-metadata";

type DocsArticlePageProps = {
  params: Promise<{ locale: "en" | "id"; slug: string }>;
};

export async function generateMetadata({ params }: DocsArticlePageProps) {
  const { locale, slug } = await params;

  if (!isMarketingDocSlug(slug)) {
    return {};
  }

  const doc = getMarketingDocMeta(locale, slug);

  return buildMarketingMetadata({
    locale,
    pathname: `/docs/${slug}`,
    title: `${doc.title} | Wabrix Docs`,
    description: doc.description,
    keywords: [doc.title, doc.category, "Wabrix docs"],
  });
}

export default async function DocsArticlePage({ params }: DocsArticlePageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "DocsMarketing" });

  if (!isMarketingDocSlug(slug)) {
    notFound();
  }

  const [doc, content, summaries] = await Promise.all([
    Promise.resolve(getMarketingDocMeta(locale, slug)),
    getMarketingDocContent(locale, slug),
    Promise.resolve(getMarketingDocSummaries(locale)),
  ]);

  return (
    <div className="space-y-8 pb-10 pt-10 sm:pt-14">
      <Button asChild variant="ghost" className="px-0 text-slate-700 hover:bg-transparent">
        <Link href={`/${locale}/docs`}>
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <Card className="h-fit border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <Badge variant="secondary" className="w-fit rounded-full">
              {doc.category}
            </Badge>
            <CardTitle className="text-2xl text-slate-950">{doc.title}</CardTitle>
            <CardDescription className="leading-7 text-slate-600">
              {doc.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summaries.map((entry) => (
              <Button
                key={entry.slug}
                asChild
                variant={entry.slug === slug ? "secondary" : "ghost"}
                className="w-full justify-between"
              >
                <Link href={`/${locale}/docs/${entry.slug}`}>
                  <span>{entry.title}</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardContent className="px-6 py-8 sm:px-8">
            <article className="docs-content max-w-none text-slate-700">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
