"use client"

import { useGasStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Activity, Calculator } from "lucide-react"

export function ModeToggle() {
  const { mode, setMode } = useGasStore()

  return (
    <div className="flex bg-slate-800 rounded-lg p-1">
      <Button
        variant={mode === "live" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMode("live")}
        className={`flex items-center gap-2 ${
          mode === "live" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
        }`}
      >
        <Activity className="w-4 h-4" />
        Live Mode
      </Button>
      <Button
        variant={mode === "simulation" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMode("simulation")}
        className={`flex items-center gap-2 ${
          mode === "simulation" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
        }`}
      >
        <Calculator className="w-4 h-4" />
        Simulation
      </Button>
    </div>
  )
}
