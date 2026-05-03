import {
  RiCloudFill,
  RiDatabase2Fill,
  RiMessage3Fill,
  RiRobotFill,
} from "@remixicon/react";
import Image from "next/image";

export const Map = () => {
  return (
    <section
      id="agent-orchestration"
      aria-labelledby="management-title"
      className="relative flex w-full max-w-6xl scroll-my-24 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gray-950 px-10 shadow-2xl shadow-black/50 sm:px-16 md:px-28 lg:mx-auto"
    >
      <div className="absolute left-0 z-10 h-full backdrop-blur-[2px]">
        <svg
          className="h-full w-8 border-r border-zinc-900 stroke-zinc-800 sm:w-20"
          style={{
            maskImage:
              "linear-gradient(transparent, white 10rem, white calc(100% - 10rem), transparent)",
          }}
        >
          <defs>
            <pattern
              id="diagonal-border-pattern"
              patternUnits="userSpaceOnUse"
              width="64"
              height="64"
            >
              {Array.from({ length: 17 }, (_, i) => {
                const offset = i * 8;
                return (
                  <path
                    key={i}
                    d={`M${-106 + offset} 110L${22 + offset} -18`}
                    stroke=""
                    strokeWidth="1"
                  />
                );
              })}
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#diagonal-border-pattern)"
          />
        </svg>
      </div>
      <div className="absolute right-0 z-10 h-full backdrop-blur-[2px]">
        <svg
          className="h-full w-8 border-r border-zinc-900 stroke-zinc-800 sm:w-20"
          style={{
            maskImage:
              "linear-gradient(transparent, white 10rem, white calc(100% - 10rem), transparent)",
          }}
        >
          <defs>
            <pattern
              id="diagonal-border-pattern"
              patternUnits="userSpaceOnUse"
              width="64"
              height="64"
            >
              {Array.from({ length: 17 }, (_, i) => {
                const offset = i * 8;
                return (
                  <path
                    key={i}
                    d={`M${-106 + offset} 110L${22 + offset} -18`}
                    stroke=""
                    strokeWidth="1"
                  />
                );
              })}
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#diagonal-border-pattern)"
          />
        </svg>
      </div>

      <div className="pt-12 text-base font-semibold tracking-tight text-violet-400 sm:pt-20 sm:text-lg">
        WhatsApp Orchestration
      </div>
      <h2
        id="management-title"
        className="mt-6 max-w-[700px] text-center text-2xl font-semibold tracking-tight text-balance text-white md:text-5xl"
      >
        Unified Control Plane for WhatsApp AI Agents
      </h2>
      <p className="mt-4 max-w-2xl text-center text-base text-balance text-gray-400 sm:mt-8 sm:text-xl">
        Orchestrate agents across multiple WhatsApp numbers and teams. Monitor
        inbox traffic, workflow routing, and knowledge sync in real time—so
        every reply stays consistent and auditable.
      </p>

      <div className="relative mt-20 mb-10 flex w-full scale-90 items-center justify-center sm:mb-16 md:mt-24 md:scale-100">
        <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
          <Image
            src="/images/wabrix_global_map.png"
            alt="WhatsApp agent operations overview"
            fill
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/50" />

          {/* Processing Indicator - North America */}
          <div className="absolute top-[25%] left-[15%] z-20">
            <div className="relative flex items-center justify-center">
              <div className="absolute size-10 rounded-full bg-gray-950/80 shadow-xl ring-1 ring-white/15 backdrop-blur-sm"></div>
              <div className="absolute -top-7 left-1/2 flex w-fit -translate-x-1/2 items-center justify-center rounded-full bg-gray-950 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white ring-1 ring-white/20">
                Inbox
              </div>
              <RiMessage3Fill className="relative size-4 text-white" />
              <div
                style={{ animationDelay: "1s" }}
                className="absolute size-12 animate-[ping_5s_ease_infinite] rounded-full ring-1 ring-violet-500/50"
              ></div>
            </div>
          </div>

          {/* Indexing Indicator - Europe */}
          <div className="absolute top-[20%] left-[48%] z-20">
            <div className="relative flex items-center justify-center">
              <div className="absolute size-10 rounded-full bg-gray-950/80 shadow-xl ring-1 ring-white/15 backdrop-blur-sm"></div>
              <div className="absolute -top-7 left-1/2 flex w-fit -translate-x-1/2 items-center justify-center rounded-full bg-gray-950 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white ring-1 ring-white/20">
                Workflow
              </div>
              <RiRobotFill className="relative size-4 text-white" />
              <div
                style={{ animationDelay: "2s" }}
                className="absolute size-12 animate-[ping_5s_ease_infinite] rounded-full ring-1 ring-violet-500/50"
              ></div>
            </div>
          </div>

          {/* Live Indicator - Asia */}
          <div className="absolute top-[40%] right-[15%] z-20">
            <div className="relative flex items-center justify-center">
              <div className="absolute size-10 rounded-full bg-gray-950/80 shadow-xl ring-1 ring-white/15 backdrop-blur-sm"></div>
              <div className="absolute -top-7 left-1/2 flex w-fit -translate-x-1/2 items-center justify-center rounded-full bg-gray-950 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white ring-1 ring-white/20">
                Knowledge
              </div>
              <RiDatabase2Fill className="relative size-4 text-white" />
              <div
                style={{ animationDelay: "3s" }}
                className="absolute size-12 animate-[ping_5s_ease_infinite] rounded-full ring-1 ring-violet-500/50"
              ></div>
            </div>
          </div>

          {/* Cloud Hub Indicator - Africa */}
          <div className="absolute bottom-[30%] left-[45%] z-20">
            <div className="relative flex items-center justify-center">
              <div className="absolute size-10 rounded-full bg-gray-950/80 shadow-xl ring-1 ring-white/15 backdrop-blur-sm"></div>
              <RiCloudFill className="relative size-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
