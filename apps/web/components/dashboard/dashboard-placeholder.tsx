type DashboardPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function DashboardPlaceholder({
  eyebrow,
  title,
  description,
}: DashboardPlaceholderProps) {
  return (
    <section className="flex flex-1 items-center justify-center p-6 md:p-10">
      <div className="bg-card text-card-foreground w-full max-w-3xl rounded-3xl border p-8 shadow-sm">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.24em] uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-7">{description}</p>
      </div>
    </section>
  );
}
