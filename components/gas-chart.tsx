"use client"

import { useEffect, useRef } from "react"
import { createChart, ColorType, type IChartApi, type ISeriesApi } from "lightweight-charts"
import { useGasStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function GasChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Record<string, ISeriesApi<"line">>>({})
  const { chains } = useGasStore()

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1e293b" },
        textColor: "#e2e8f0",
      },
      grid: {
        vertLines: { color: "#334155" },
        horzLines: { color: "#334155" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Create series for each chain
    const colors = {
      ethereum: "#3b82f6",
      polygon: "#8b5cf6",
      arbitrum: "#f97316",
    }

    Object.keys(chains).forEach((chainKey) => {
      const series = chart.addLineSeries({
        color: colors[chainKey as keyof typeof colors],
        lineWidth: 2,
        title: chainKey.charAt(0).toUpperCase() + chainKey.slice(1),
      })
      seriesRef.current[chainKey] = series
    })

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current) return

    // Update chart data
    Object.entries(chains).forEach(([chainKey, chainData]) => {
      const series = seriesRef.current[chainKey]
      if (series && chainData.history.length > 0) {
        const data = chainData.history.map((point) => ({
          time: Math.floor(point.timestamp / 1000) as any,
          value: point.baseFee + point.priorityFee,
        }))
        series.setData(data)
      }
    })
  }, [chains])

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Gas Price History (15min intervals)</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="w-full" />
      </CardContent>
    </Card>
  )
}
