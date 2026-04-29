import type { SVGProps } from "react"

export const LineChartIllustration = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 980 328"
    {...props}
  >
    {/* Grid Lines */}
    <path d="M60 280H980" stroke="#E6E6E6" strokeWidth="1" />
    <path d="M60 210H980" stroke="#E6E6E6" strokeWidth="1" />
    <path d="M60 140H980" stroke="#E6E6E6" strokeWidth="1" />
    <path d="M60 70H980" stroke="#E6E6E6" strokeWidth="1" />
    <path d="M60 5H980" stroke="#E6E6E6" strokeWidth="1" />

    {/* Y-Axis Labels */}
    <text x="0" y="284" fill="#9CA3AF" fontSize="12" fontWeight="500">0 msgs</text>
    <text x="0" y="214" fill="#9CA3AF" fontSize="12" fontWeight="500">5,000 msgs</text>
    <text x="0" y="144" fill="#9CA3AF" fontSize="12" fontWeight="500">10,000 msgs</text>
    <text x="0" y="74" fill="#9CA3AF" fontSize="12" fontWeight="500">15,000 msgs</text>
    <text x="0" y="9" fill="#9CA3AF" fontSize="12" fontWeight="500">20,000 msgs</text>

    {/* Chart Lines (Smoothed Paths) */}
    {/* Sales Agent - Violet */}
    <path
      d="M60 250 Q 150 200, 240 230 T 420 150 T 600 180 T 780 80 T 960 110"
      stroke="#8b5cf6"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Support Bot - Fuchsia */}
    <path
      d="M60 200 Q 150 180, 240 210 T 420 120 T 600 140 T 780 60 T 960 90"
      stroke="#d946ef"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    {/* Knowledge Bot - Indigo */}
    <path
      d="M60 150 Q 150 140, 240 170 T 420 100 T 600 110 T 780 40 T 960 60"
      stroke="#6366f1"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.6"
    />

    {/* X-Axis Labels (Timeline) */}
    <text x="60" y="310" fill="#9CA3AF" fontSize="10">Day 1</text>
    <text x="210" y="310" fill="#9CA3AF" fontSize="10">Day 7</text>
    <text x="360" y="310" fill="#9CA3AF" fontSize="10">Day 14</text>
    <text x="510" y="310" fill="#9CA3AF" fontSize="10">Day 21</text>
    <text x="660" y="310" fill="#9CA3AF" fontSize="10">Day 28</text>
    <text x="810" y="310" fill="#9CA3AF" fontSize="10">Day 30</text>

    {/* Legend (Top Right) */}
    <g transform="translate(650, -20)">
      <rect x="0" y="40" width="12" height="12" rx="2" fill="#8b5cf6" />
      <text x="20" y="50" fill="#4B5563" fontSize="12" fontWeight="500">Sales Agent</text>
      
      <rect x="110" y="40" width="12" height="12" rx="2" fill="#d946ef" />
      <text x="130" y="50" fill="#4B5563" fontSize="12" fontWeight="500">Support Bot</text>
      
      <rect x="220" y="40" width="12" height="12" rx="2" fill="#6366f1" />
      <text x="240" y="50" fill="#4B5563" fontSize="12" fontWeight="500">Knowledge Bot</text>
    </g>
  </svg>
)
