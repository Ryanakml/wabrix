import Image from "next/image";

export default function Testimonial() {
  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-xl shadow-2xl shadow-violet-500/30">
      <div className="absolute inset-0 object-cover">
        <Image
          alt="tech background"
          src="/images/wabrix_testimonial_bg_20260503.png"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent z-10" />
      </div>

      <div className="absolute top-76 -right-14 w-76 sm:top-48 sm:right-3 sm:w-92 md:top-48 md:right-0 md:w-100 lg:top-32 lg:-right-4 lg:w-120">
        <Image
          alt="Wabrix 3D Icon"
          src="/images/wabrix_icon_3d_20260503.png"
          width={1024}
          height={1024}
          className="animate-hover mix-blend-screen drop-shadow-2xl"
        />
      </div>

      <div className="relative z-20 mb-20 p-8 sm:p-14 lg:p-24">
        <div className="">
          <blockquote className="relative max-w-2xl text-xl leading-relaxed tracking-tight text-white drop-shadow-md md:text-2xl lg:text-3xl font-medium">
            <p className="before:absolute before:top-0 before:right-full before:content-['“'] after:text-white/60 after:content-['”'] line-clamp-6">
              <strong className="font-bold text-violet-400">
                Wabrix transformed our customer engagement workflow.
              </strong>{" "}
              <span className="text-white/95">
                Their AI agents handle thousands of queries instantly, allowing
                our team to focus on high-value strategy while maintaining a
                personal touch on WhatsApp with unprecedented efficiency.
              </span>
            </p>
          </blockquote>
        </div>
        <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative shrink-0 rounded-full bg-white/20 p-0.5 ring-1 ring-white/30">
            <Image
              alt="Alex Rivera"
              src="/images/smiller.jpeg"
              width={56}
              height={56}
              className="rounded-full border border-white/40 object-contain"
            />
          </div>
          <div>
            <div className="text-base font-semibold text-white drop-shadow-sm">
              Alex Rivera
            </div>
            <div className="text-sm font-medium text-violet-400 drop-shadow-sm">
              Head of Customer Success at TechScale
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
