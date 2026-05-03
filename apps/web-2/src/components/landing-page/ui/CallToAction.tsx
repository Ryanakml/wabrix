import Image from "next/image";
import Link from "next/link";
import { Button } from "../Button";

export function CallToAction() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-6xl">
      <div className="grid items-center gap-8 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <h2
            id="cta-title"
            className="scroll-my-60 text-3xl font-semibold tracking-tighter text-balance text-gray-900 md:text-4xl"
          >
            Ready to deploy your AI agent?
          </h2>
          <p className="mt-3 mb-8 text-lg text-gray-600">
            Join hundreds of businesses automating their customer support and
            sales with Wabrix. Start your 14-day free trial today.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              asChild
              className="text-md bg-violet-600 hover:bg-violet-700"
            >
              <Link href="/auth/sign-in">Get Started for Free</Link>
            </Button>
            <Button asChild className="text-md" variant="secondary">
              <Link href="/auth/sign-in">Schedule a Demo</Link>
            </Button>
          </div>
        </div>
        <div className="relative isolate h-64 rounded-xl overflow-hidden sm:col-span-4 sm:h-80 md:h-96">
          <Image
            aria-hidden
            alt="AI Data Network"
            src="/images/wabrix_cta_landscape_20260503.png"
            fill
            sizes="(min-width: 640px) 66vw, 100vw"
            className="absolute inset-0 -z-10 rounded-2xl blur-xl object-cover"
          />
          <Image
            alt="AI Data Network"
            src="/images/wabrix_cta_landscape_20260503.png"
            fill
            sizes="(min-width: 640px) 66vw, 100vw"
            className="relative z-10 rounded-2xl object-contain"
          />
        </div>
      </div>
    </section>
  );
}

export default CallToAction;
