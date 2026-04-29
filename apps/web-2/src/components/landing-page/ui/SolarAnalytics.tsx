import {
  RiPieChartFill,
  RiRobot3Fill,
  RiTeamFill,
  RiTranslate2,
} from "@remixicon/react"

import { Divider } from "../Divider"
import AnalyticsIllustration from "./AnalyticsIllustration"
import { StickerCard } from "./StickerCard"

export function SolarAnalytics() {
  return (
    <section
      aria-labelledby="wabrix-analytics"
      className="relative mx-auto w-full max-w-6xl overflow-hidden"
    >
      <div>
        <h2
          id="wabrix-analytics"
          className="relative scroll-my-24 text-lg font-semibold tracking-tight text-violet-500"
        >
          Wabrix Insights
          <div className="absolute top-1 -left-[8px] h-5 w-[3px] rounded-r-sm bg-violet-500" />
        </h2>
        <p className="mt-2 max-w-lg text-3xl font-semibold tracking-tighter text-balance text-gray-900 md:text-4xl">
          Monitor your AI performance with real-time analytics
        </p>
      </div>
      <div className="*:pointer-events-none">
        <AnalyticsIllustration />
      </div>
      <Divider className="mt-0"></Divider>
      <div className="grid grid-cols-1 grid-rows-2 gap-6 md:grid-cols-4 md:grid-rows-1">
        <StickerCard
          Icon={RiRobot3Fill}
          title="AI Handling Rate"
          description="Percentage of conversations fully resolved by AI agents without human help."
        />
        <StickerCard
          Icon={RiTranslate2}
          title="Auto-Translation"
          description="Real-time multi-language translation across all WhatsApp conversations."
        />
        <StickerCard
          Icon={RiTeamFill}
          title="Human Handoff"
          description="Seamlessly transition complex queries to your human support team."
        />
        <StickerCard
          Icon={RiPieChartFill}
          title="Token Usage"
          description="Track AI consumption and messaging volume with transparent metrics."
        />
      </div>
    </section>

  )
}
