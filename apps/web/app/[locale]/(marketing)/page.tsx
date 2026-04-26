import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BrainCircuit, Globe2, MessageSquareText, ShieldCheck, Sparkles, Workflow } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buildMarketingMetadata } from "@/lib/marketing-metadata";

type MarketingPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: MarketingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Marketing.seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/",
    title: t("title"),
    description: t("description"),
    keywords: [
      "WhatsApp SaaS",
      "WhatsApp AI automation",
      "WhatsApp inbox",
      "WhatsApp billing",
      "WhatsApp bot",
    ],
  });
}

export default async function MarketingPage({ params }: MarketingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Marketing" });

  const stats = ["statOne", "statTwo", "statThree"].map((key) => ({
    label: t(`hero.${key}.label`),
    value: t(`hero.${key}.value`),
  }));
  const features = [
    {
      title: t("features.items.0.title"),
      body: t("features.items.0.body"),
      icon: Sparkles,
    },
    {
      title: t("features.items.1.title"),
      body: t("features.items.1.body"),
      icon: ShieldCheck,
    },
    {
      title: t("features.items.2.title"),
      body: t("features.items.2.body"),
      icon: Workflow,
    },
    {
      title: t("features.items.3.title"),
      body: t("features.items.3.body"),
      icon: BrainCircuit,
    },
    {
      title: t("features.items.4.title"),
      body: t("features.items.4.body"),
      icon: MessageSquareText,
    },
    {
      title: t("features.items.5.title"),
      body: t("features.items.5.body"),
      icon: Globe2,
    },
  ];
  const testimonials = Array.from({ length: 3 }, (_, index) => ({
    quote: t(`testimonials.items.${index}.quote`),
    name: t(`testimonials.items.${index}.name`),
    role: t(`testimonials.items.${index}.role`),
  }));
  const faqs = Array.from({ length: 4 }, (_, index) => ({
    question: t(`faq.items.${index}.question`),
    answer: t(`faq.items.${index}.answer`),
  }));

  return (
    <div className="space-y-20 pb-10 pt-10 sm:pt-14">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="space-y-8">
          <Badge className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
            {t("hero.badge")}
          </Badge>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              {t("hero.description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-slate-200">
              <Link href={`/${locale}/pricing`}>
                {t("hero.primaryCta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={`/${locale}/docs`}>{t("hero.secondaryCta")}</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="border-white/10 bg-white/8 text-white ring-white/10 backdrop-blur"
              >
                <CardHeader>
                  <CardDescription className="text-slate-300">
                    {stat.label}
                  </CardDescription>
                  <CardTitle className="text-2xl text-white">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Card className="border-white/10 bg-slate-950/70 text-white ring-white/10 shadow-[0_28px_90px_rgba(8,15,36,0.5)]">
          <CardHeader>
            <Badge variant="secondary" className="w-fit rounded-full bg-cyan-400/15 text-cyan-200">
              {t("hero.snapshotBadge")}
            </Badge>
            <CardTitle className="text-2xl text-white">{t("hero.snapshotTitle")}</CardTitle>
            <CardDescription className="text-slate-300">
              {t("hero.snapshotDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-300">
                    {t(`hero.snapshotItems.${index}.label`)}
                  </p>
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-white/10 text-white"
                  >
                    {t(`hero.snapshotItems.${index}.value`)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {t(`hero.snapshotItems.${index}.body`)}
                </p>
              </div>
            ))}
          </CardContent>
          <CardFooter className="border-white/10 bg-white/5 text-sm text-slate-300">
            {t("hero.snapshotFootnote")}
          </CardFooter>
        </Card>
      </section>

      <section className="space-y-8">
        <div className="max-w-3xl space-y-3">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {t("features.badge")}
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {t("features.title")}
          </h2>
          <p className="text-base leading-8 text-slate-600">
            {t("features.description")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title} className="border-slate-200/80 bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-slate-950">{feature.title}</CardTitle>
                  <CardDescription className="leading-7 text-slate-600">
                    {feature.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200/80 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
          <CardHeader>
            <Badge className="w-fit rounded-full border border-white/10 bg-white/5 text-white">
              {t("workflow.badge")}
            </Badge>
            <CardTitle className="text-3xl text-white">{t("workflow.title")}</CardTitle>
            <CardDescription className="leading-7 text-slate-300">
              {t("workflow.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">
                  {t(`workflow.items.${index}.title`)}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {t(`workflow.items.${index}.body`)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <Badge variant="secondary" className="w-fit rounded-full">
              {t("proof.badge")}
            </Badge>
            <CardTitle className="text-3xl text-slate-950">{t("proof.title")}</CardTitle>
            <CardDescription className="leading-7 text-slate-600">
              {t("proof.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  {t(`proof.items.${index}.title`)}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {t(`proof.items.${index}.body`)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {t("testimonials.badge")}
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {t("testimonials.title")}
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-slate-600">
            {t("testimonials.description")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={testimonial.name} className="border-slate-200/80 bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
              <CardContent className="pt-6">
                <p className="text-base leading-8 text-slate-700">
                  “{testimonial.quote}”
                </p>
              </CardContent>
              <CardFooter className="items-center justify-between border-slate-200/70 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {testimonial.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
                <Badge variant="outline">{index + 1}</Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <Badge variant="secondary" className="w-fit rounded-full">
              {t("cta.badge")}
            </Badge>
            <CardTitle className="text-3xl text-slate-950">{t("cta.title")}</CardTitle>
            <CardDescription className="leading-7 text-slate-600">
              {t("cta.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg">
                <Link href={`/${locale}/pricing`}>{t("cta.primary")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/${locale}/docs`}>{t("cta.secondary")}</Link>
              </Button>
            </div>
            <Separator />
            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>{t("cta.points.0")}</p>
              <p>{t("cta.points.1")}</p>
              <p>{t("cta.points.2")}</p>
              <p>{t("cta.points.3")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <Badge variant="secondary" className="w-fit rounded-full">
              {t("faq.badge")}
            </Badge>
            <CardTitle className="text-3xl text-slate-950">{t("faq.title")}</CardTitle>
            <CardDescription className="leading-7 text-slate-600">
              {t("faq.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
