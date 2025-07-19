"use client"

import { useEffect } from "react"
import { useGasStore } from "@/lib/store"
import { ModeToggle } from "@/components/mode-toggle"
import { EthPriceDisplay } from "@/components/eth-price-display"
import { GasTracker } from "@/components/gas-tracker"
import { SimulationPanel } from "@/components/simulation-panel"
import { GasChart } from "@/components/gas-chart"
import { WalletConnector } from "@/components/wallet-connector"
import { WalletSimulator } from "@/components/wallet-simulator"
import { startGasTracking, startEthPriceTracking } from "@/lib/blockchain"

export default function Dashboard() {
  const { mode } = useGasStore()

  useEffect(() => {
    // Start tracking gas prices and ETH price
    const gasCleanup = startGasTracking()
    const priceCleanup = startEthPriceTracking()

    return () => {
      gasCleanup()
      priceCleanup()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Cross-Chain Gas Tracker</h1>
          <p className="text-slate-300">Real-time gas prices and wallet simulation across multiple chains</p>
        </div>

        <div className="grid gap-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <EthPriceDisplay />
            <ModeToggle />
          </div>

          {/* Wallet Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WalletConnector />
            <WalletSimulator />
          </div>

          {/* Main Content */}
          {mode === "live" ? (
            <div className="grid gap-6">
              <GasTracker />
              <GasChart />
            </div>
          ) : (
            <div className="grid gap-6">
              <SimulationPanel />
              <GasChart />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
