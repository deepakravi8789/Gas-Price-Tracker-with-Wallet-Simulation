"use client"

import { useGasStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const CHAIN_COLORS = {
  ethereum: "bg-blue-500",
  polygon: "bg-purple-500",
  arbitrum: "bg-orange-500",
}

const CHAIN_NAMES = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
}

export function GasTracker() {
  const { chains } = useGasStore()

  // Add debugging
  console.log("GasTracker render - current chains:", chains)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(chains).map(([key, data]) => (
        <Card key={key} className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <div className={`w-3 h-3 rounded-full ${CHAIN_COLORS[key as keyof typeof CHAIN_COLORS]}`} />
              {CHAIN_NAMES[key as keyof typeof CHAIN_NAMES]}
              {data.baseFee === 0 && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Loading..." />
              )}
              {data.baseFee > 0 && <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Base Fee</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">
                    {data.baseFee > 0 ? data.baseFee.toFixed(2) : "---"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Gwei
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Priority Fee</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">
                    {data.priorityFee > 0 ? data.priorityFee.toFixed(2) : "---"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Gwei
                  </Badge>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <p className="text-sm text-slate-400 mb-1">Total Gas Price</p>
              <span className="text-lg font-semibold text-green-400">
                {data.baseFee > 0 ? (data.baseFee + data.priorityFee).toFixed(2) : "---"} Gwei
              </span>
            </div>
            {/* Debug info - remove in production */}
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
              Debug: Base={data.baseFee.toFixed(4)}, Priority={data.priorityFee.toFixed(4)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
