"use client"

import { useGasStore } from "@/lib/store"
import { TrendingUp } from "lucide-react"

export function EthPriceDisplay() {
  const { ethUsdPrice } = useGasStore()

  return (
    <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <TrendingUp className={`w-5 h-5 ${ethUsdPrice > 0 ? "text-green-400" : "text-yellow-400"}`} />
        <span className="text-slate-300 font-medium">ETH/USD</span>
        {ethUsdPrice === 0 && (
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Loading price..." />
        )}
      </div>
      <div className="text-2xl font-bold text-white">${ethUsdPrice > 0 ? ethUsdPrice.toFixed(2) : "Loading..."}</div>
    </div>
  )
}
