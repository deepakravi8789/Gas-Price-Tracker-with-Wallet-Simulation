import { create } from "zustand"

export interface ChainData {
  baseFee: number
  priorityFee: number
  history: Array<{
    timestamp: number
    baseFee: number
    priorityFee: number
  }>
}

export interface GasStore {
  mode: "live" | "simulation"
  ethUsdPrice: number
  chains: {
    ethereum: ChainData
    polygon: ChainData
    arbitrum: ChainData
  }
  setMode: (mode: "live" | "simulation") => void
  setEthPrice: (price: number) => void
  updateChainData: (chain: keyof GasStore["chains"], data: Partial<ChainData>) => void
  addHistoryPoint: (chain: keyof GasStore["chains"], point: ChainData["history"][0]) => void
}

export const useGasStore = create<GasStore>((set, get) => ({
  mode: "live",
  ethUsdPrice: 0,
  chains: {
    ethereum: { baseFee: 0, priorityFee: 0, history: [] },
    polygon: { baseFee: 0, priorityFee: 0, history: [] },
    arbitrum: { baseFee: 0, priorityFee: 0, history: [] },
  },
  setMode: (mode) => set({ mode }),
  setEthPrice: (ethUsdPrice) => set({ ethUsdPrice }),
  updateChainData: (chain, data) =>
    set((state) => ({
      chains: {
        ...state.chains,
        [chain]: { ...state.chains[chain], ...data },
      },
    })),
  addHistoryPoint: (chain, point) =>
    set((state) => {
      const history = [...state.chains[chain].history, point]
      // Keep only last 100 points (25 hours of 15-min intervals)
      if (history.length > 100) {
        history.shift()
      }
      return {
        chains: {
          ...state.chains,
          [chain]: { ...state.chains[chain], history },
        },
      }
    }),
}))
