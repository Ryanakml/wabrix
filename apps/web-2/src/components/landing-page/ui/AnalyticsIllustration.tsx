import { LineChartIllustration } from "../LineChartIllustration"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from "../Table"

const summary = [
  {
    name: "Sales Assistant",
    value: "14,349",
    handled: "13,900",
    handoff: "449",
    csat: "+4.2%",
    efficiency: "+12.8%",
    tokens: "124K",
    bgColor: "bg-violet-500",
    changeType: "positive",
  },
  {
    name: "Customer Support",
    value: "25,943",
    handled: "21,600",
    handoff: "4,343",
    csat: "+3.1%",
    efficiency: "+5.6%",
    tokens: "452K",
    bgColor: "bg-fuchsia-500",
    changeType: "positive",
  },
  {
    name: "Operations Bot",
    value: "9,443",
    handled: "4,600",
    handoff: "4,843",
    csat: "-5.1%",
    efficiency: "-6.3%",
    tokens: "89K",
    bgColor: "bg-indigo-500",
    changeType: "negative",
  },
]

export default function FieldPerformance() {
  return (
    <div className="h-150 shrink-0 overflow-hidden mask-[radial-gradient(white_30%,transparent_90%)] perspective-[4000px] perspective-origin-center">
      <div className="-translate-y-10 -translate-z-10 rotate-x-10 rotate-y-20 -rotate-z-10 transform-3d">
        <h3 className="text-sm text-gray-500">Message Volume Overview</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          142,593 messages
        </p>
        <p className="mt-1 text-sm font-medium">
          <span className="text-emerald-700">+12,430 messages (8.4%)</span>{" "}
          <span className="font-normal text-gray-500">Past 30 days</span>
        </p>
        <LineChartIllustration className="mt-8 w-full min-w-200 shrink-0" />

        <TableRoot className="mt-6 min-w-200">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Bot Agent</TableHeaderCell>
                <TableHeaderCell className="text-right">Messages</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  AI Handled
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Handoffs
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  CSAT
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Efficiency
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Tokens
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium text-gray-900">
                    <div className="flex space-x-3">
                      <span
                        className={item.bgColor + " w-1 shrink-0 rounded"}
                        aria-hidden="true"
                      />
                      <span>{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.value}</TableCell>
                  <TableCell className="text-right">{item.handled}</TableCell>
                  <TableCell className="text-right">{item.handoff}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        item.changeType === "positive"
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      {item.csat}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        item.changeType === "positive"
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      {item.efficiency}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className="text-gray-900"
                    >
                      {item.tokens}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRoot>
      </div>
    </div>
  )
}

