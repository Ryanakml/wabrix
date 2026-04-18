type CardProps = {
  title: string;
  description: string;
};

export function Card({ title, description }: CardProps) {
  return (
    <article className="rounded-[1.6rem] border border-black/10 bg-white/85 p-5 shadow-[0_18px_60px_rgba(27,40,31,0.08)] backdrop-blur">
      <h3 className="text-lg font-semibold tracking-tight text-stone-950">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-stone-700">{description}</p>
    </article>
  );
}
