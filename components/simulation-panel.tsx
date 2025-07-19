"use client"

import { useState } from "react"
import { useGasStore } from "@/lib/store"
import { calculateGasCost } from "@/lib/blockchain"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const CHAIN_NAMES = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
}

export function SimulationPanel() {
  const { chains, ethUsdPrice } = useGasStore()
  const [txValue, setTxValue] = useState("0.1")
  const [selectedChain, setSelectedChain] = useState("ethereum")
  const [results, setResults] = useState<Record<string, number>>({})

  const handleSimulate = () => {
    console.log("=== Starting Gas Cost Calculation ===")
    console.log("Current ETH price:", ethUsdPrice)
    console.log("Current chain data:", chains)

    const newResults: Record<string, number> = {}

    // Check if we have ETH price
    if (ethUsdPrice === 0) {
      console.warn("ETH price not available yet")
      alert("ETH price is still loading. Please wait a moment and try again.")
      return
    }

    Object.entries(chains).forEach(([key, data]) => {
      console.log(`Processing ${key}:`, data)

      if (data.baseFee === 0) {
        console.warn(`No gas data available for ${key}`)
        return
      }

      const gasCost = calculateGasCost(data.baseFee, data.priorityFee, 21000, ethUsdPrice)
      newResults[key] = gasCost
      console.log(`${key} gas cost: $${gasCost.toFixed(4)}`)
    })

    console.log("Final results:", newResults)
    setResults(newResults)
  }

  return (
    <div className="grid gap-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transaction Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="txValue" className="text-slate-300">
                Transaction Value
              </Label>
              <Input
                id="txValue"
                type="number"
                step="0.01"
                value={txValue}
                onChange={(e) => setTxValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="0.1"
              />
            </div>
            <div>
              <Label htmlFor="chain" className="text-slate-300">
                Primary Chain
              </Label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHAIN_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSimulate} className="w-full bg-blue-600 hover:bg-blue-700">
                Calculate Costs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(results).length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Gas Cost Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300">Chain</th>
                    <th className="text-left py-3 px-4 text-slate-300">Base Fee</th>
                    <th className="text-left py-3 px-4 text-slate-300">Priority Fee</th>
                    <th className="text-left py-3 px-4 text-slate-300">Gas Cost (USD)</th>
                    <th className="text-left py-3 px-4 text-slate-300">% of Tx Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([key, cost]) => {
                    const chainData = chains[key as keyof typeof chains]
                    const txValueUsd = Number.parseFloat(txValue) * ethUsdPrice
                    const percentage = txValueUsd > 0 ? (cost / txValueUsd) * 100 : 0

                    return (
                      <tr key={key} className="border-b border-slate-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                key === "ethereum"
                                  ? "bg-blue-500"
                                  : key === "polygon"
                                    ? "bg-purple-500"
                                    : "bg-orange-500"
                              }`}
                            />
                            <span className="text-white font-medium">
                              {CHAIN_NAMES[key as keyof typeof CHAIN_NAMES]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{chainData.baseFee.toFixed(2)} Gwei</td>
                        <td className="py-3 px-4 text-slate-300">{chainData.priorityFee.toFixed(2)} Gwei</td>
                        <td className="py-3 px-4">
                          <span className="text-white font-semibold">${cost.toFixed(4)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-medium ${
                              percentage > 5 ? "text-red-400" : percentage > 2 ? "text-yellow-400" : "text-green-400"
                            }`}
                          >
                            {percentage.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
