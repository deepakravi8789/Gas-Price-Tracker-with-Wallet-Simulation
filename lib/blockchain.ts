import { ethers } from "ethers"
import { useGasStore } from "./store"

// Updated chain configurations with working RPC endpoints
const CHAINS = {
  ethereum: {
    name: "Ethereum",
    rpc: "wss://eth-mainnet.g.alchemy.com/v2/3qVOcj8-5jRyYCwM3sm1xujVxHGpqJbm",
    chainId: 1,
  },
  polygon: {
    name: "Polygon",
    rpc: "wss://polygon-mainnet.g.alchemy.com/v2/3qVOcj8-5jRyYCwM3sm1xujVxHGpqJbm",
    chainId: 137,
  },
  arbitrum: {
    name: "Arbitrum",
    rpc: "wss://arb-mainnet.g.alchemy.com/v2/3qVOcj8-5jRyYCwM3sm1xujVxHGpqJbm",
    chainId: 42161,
  },
}

// Uniswap V3 ETH/USDC pool
const UNISWAP_POOL_ADDRESS = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
const SWAP_ABI = [
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
]

let providers: Record<string, ethers.WebSocketProvider> = {}
let intervals: NodeJS.Timeout[] = []
let uniswapContract: ethers.Contract | null = null

export function startGasTracking() {
  console.log("Starting gas tracking...")

  // Initialize providers for each chain
  Object.entries(CHAINS).forEach(([key, config]) => {
    try {
      console.log(`Connecting to ${config.name}...`)
      const provider = new ethers.WebSocketProvider(config.rpc)
      providers[key] = provider

      // Initial fetch
      fetchGasData(key as keyof typeof CHAINS, provider)

      // Set up interval for gas data (every 6 seconds)
      const interval = setInterval(() => {
        fetchGasData(key as keyof typeof CHAINS, provider)
      }, 6000)

      intervals.push(interval)

      // Set up 15-minute history collection
      const historyInterval = setInterval(() => {
        collectHistoryPoint(key as keyof typeof CHAINS, provider)
      }, 900000) // 15 minutes

      intervals.push(historyInterval)
    } catch (error) {
      console.error(`Failed to connect to ${config.name}:`, error)
    }
  })

  return () => {
    console.log("Cleaning up gas tracking...")
    intervals.forEach(clearInterval)
    intervals = []
    Object.values(providers).forEach((provider) => {
      try {
        provider.destroy()
      } catch (error) {
        console.error("Error destroying provider:", error)
      }
    })
    providers = {}
  }
}

async function fetchGasData(chain: keyof typeof CHAINS, provider: ethers.WebSocketProvider) {
  try {
    console.log(`Fetching gas data for ${chain}...`)

    // Get latest block
    const block = await provider.getBlock("latest")
    if (!block) {
      console.log(`No block data for ${chain}`)
      return
    }

    let baseFee = 0
    let priorityFee = 2 // Default fallback

    // Handle base fee
    if (block.baseFeePerGas) {
      baseFee = Number(block.baseFeePerGas) / 1e9
    } else {
      console.log(`No baseFeePerGas for ${chain}`)
      return
    }

    // Get priority fee with multiple fallback methods
    try {
      if (chain === "ethereum") {
        // For Ethereum, try multiple methods to get priority fee
        try {
          const priorityFeeHex = await provider.send("eth_maxPriorityFeePerGas", [])
          priorityFee = Number(priorityFeeHex) / 1e9
          console.log(`${chain} priority fee from RPC: ${priorityFee.toFixed(2)} Gwei`)
        } catch (rpcError) {
          console.log(`RPC method failed for ${chain}, trying fee history...`)

          // Fallback: Use fee history
          try {
            const feeHistory = await provider.send("eth_feeHistory", [
              "0x1", // 1 block
              "latest",
              [50], // 50th percentile
            ])

            if (feeHistory.reward && feeHistory.reward[0] && feeHistory.reward[0][0]) {
              priorityFee = Number(feeHistory.reward[0][0]) / 1e9
              console.log(`${chain} priority fee from fee history: ${priorityFee.toFixed(2)} Gwei`)
            } else {
              // Use a reasonable default for Ethereum
              priorityFee = 1.5
              console.log(`${chain} using default priority fee: ${priorityFee} Gwei`)
            }
          } catch (feeHistoryError) {
            console.log(`Fee history failed for ${chain}, using default`)
            priorityFee = 1.5 // Reasonable default for Ethereum
          }
        }
      } else {
        // For other chains, try the standard method
        try {
          const priorityFeeHex = await provider.send("eth_maxPriorityFeePerGas", [])
          priorityFee = Number(priorityFeeHex) / 1e9
        } catch (error) {
          // Chain-specific defaults
          if (chain === "polygon") {
            priorityFee = 30 // Polygon typically has higher priority fees
          } else if (chain === "arbitrum") {
            priorityFee = 0.1 // Arbitrum has very low fees
          }
        }
      }
    } catch (error) {
      console.log(`Priority fee fetch failed for ${chain}:`, error)
    }

    console.log(`${chain} - Base Fee: ${baseFee.toFixed(2)} Gwei, Priority Fee: ${priorityFee.toFixed(2)} Gwei`)

    // Update store
    const store = useGasStore.getState()
    store.updateChainData(chain, { baseFee, priorityFee })
  } catch (error) {
    console.error(`Error fetching gas data for ${chain}:`, error)
  }
}

async function collectHistoryPoint(chain: keyof typeof CHAINS, provider: ethers.WebSocketProvider) {
  try {
    const block = await provider.getBlock("latest")
    if (!block || !block.baseFeePerGas) return

    const baseFee = Number(block.baseFeePerGas) / 1e9
    const priorityFee = 2 // Use default for history

    const store = useGasStore.getState()
    store.addHistoryPoint(chain, {
      timestamp: Date.now(),
      baseFee,
      priorityFee,
    })

    console.log(`Added history point for ${chain}: ${baseFee.toFixed(2)} Gwei`)
  } catch (error) {
    console.error(`Error collecting history for ${chain}:`, error)
  }
}

export function startEthPriceTracking() {
  console.log("Starting ETH price tracking...")

  try {
    const ethProvider = new ethers.WebSocketProvider(CHAINS.ethereum.rpc)

    // Create Uniswap contract
    uniswapContract = new ethers.Contract(UNISWAP_POOL_ADDRESS, SWAP_ABI, ethProvider)

    // Initial price fetch
    fetchEthPriceFromLogs(ethProvider)

    // Set up interval for price updates (every 30 seconds)
    const interval = setInterval(() => {
      fetchEthPriceFromLogs(ethProvider)
    }, 30000)

    intervals.push(interval)

    // Listen to real-time Swap events
    uniswapContract.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick) => {
      try {
        console.log("New Uniswap swap detected")
        const price = calculatePriceFromSqrt(sqrtPriceX96)
        console.log(`ETH/USD Price from swap: $${price.toFixed(2)}`)

        const store = useGasStore.getState()
        store.setEthPrice(price)
      } catch (error) {
        console.error("Error processing swap event:", error)
      }
    })

    return () => {
      console.log("Cleaning up ETH price tracking...")
      if (interval) clearInterval(interval)
      if (uniswapContract) {
        try {
          uniswapContract.removeAllListeners()
        } catch (error) {
          console.error("Error removing listeners:", error)
        }
      }
      if (ethProvider) {
        try {
          ethProvider.destroy()
        } catch (error) {
          console.error("Error destroying ETH provider:", error)
        }
      }
    }
  } catch (error) {
    console.error("Failed to start ETH price tracking:", error)
    return () => {}
  }
}

async function fetchEthPriceFromLogs(provider: ethers.WebSocketProvider) {
  try {
    console.log("Fetching ETH price from Uniswap logs...")

    // Get recent swap events
    const currentBlock = await provider.getBlockNumber()
    const fromBlock = Math.max(currentBlock - 100, 0) // Last ~20 minutes

    const logs = await provider.getLogs({
      address: UNISWAP_POOL_ADDRESS,
      topics: [
        "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67", // Swap event topic
      ],
      fromBlock,
      toBlock: "latest",
    })

    if (logs.length > 0) {
      console.log(`Found ${logs.length} swap events`)

      // Get the most recent swap
      const latestLog = logs[logs.length - 1]
      const iface = new ethers.Interface(SWAP_ABI)

      try {
        const decoded = iface.parseLog(latestLog)
        if (decoded) {
          const sqrtPriceX96 = decoded.args.sqrtPriceX96
          const price = calculatePriceFromSqrt(sqrtPriceX96)

          console.log(`ETH/USD Price from logs: $${price.toFixed(2)}`)

          const store = useGasStore.getState()
          store.setEthPrice(price)
        }
      } catch (parseError) {
        console.error("Error parsing log:", parseError)
      }
    } else {
      console.log("No recent swap events found, using fallback price")
      // Set fallback price if no recent swaps
      const store = useGasStore.getState()
      if (store.ethUsdPrice === 0) {
        store.setEthPrice(2000) // Fallback price
      }
    }
  } catch (error) {
    console.error("Error fetching ETH price from logs:", error)
    // Set fallback price on error
    const store = useGasStore.getState()
    if (store.ethUsdPrice === 0) {
      store.setEthPrice(2000) // Fallback price
    }
  }
}

function calculatePriceFromSqrt(sqrtPriceX96: bigint): number {
  try {
    // Calculate price: (sqrtPriceX96 ** 2 * 10^12) / (2^192)
    // This gives us the price of token0 (USDC) in terms of token1 (ETH)
    // We need to invert it to get ETH/USDC price

    const sqrtPrice = Number(sqrtPriceX96)
    const price = (sqrtPrice ** 2 * 1e12) / 2 ** 192

    // Since this is USDC/ETH, we need to invert to get ETH/USDC
    const ethPrice = 1 / price

    // Ensure reasonable bounds
    if (ethPrice > 10000 || ethPrice < 100) {
      console.warn(`Calculated ETH price seems unreasonable: $${ethPrice}`)
      return 2000 // Return fallback
    }

    return ethPrice
  } catch (error) {
    console.error("Error calculating price from sqrt:", error)
    return 2000 // Fallback price
  }
}

export function calculateGasCost(baseFee: number, priorityFee: number, gasLimit = 21000, ethPrice: number): number {
  try {
    console.log(
      `Calculating gas cost: baseFee=${baseFee}, priorityFee=${priorityFee}, gasLimit=${gasLimit}, ethPrice=${ethPrice}`,
    )

    // Validate inputs
    if (baseFee <= 0 || priorityFee <= 0 || ethPrice <= 0) {
      console.warn(
        `Invalid inputs for gas calculation: baseFee=${baseFee}, priorityFee=${priorityFee}, ethPrice=${ethPrice}`,
      )
      return 0
    }

    // Total gas price in Gwei
    const totalGasPriceGwei = baseFee + priorityFee

    // Convert to ETH (divide by 1e9)
    const gasCostETH = (totalGasPriceGwei * gasLimit) / 1e9

    // Convert to USD
    const gasCostUSD = gasCostETH * ethPrice

    console.log(
      `Gas calculation: ${totalGasPriceGwei.toFixed(2)} Gwei * ${gasLimit} gas = ${gasCostETH.toFixed(8)} ETH = $${gasCostUSD.toFixed(4)}`,
    )

    return gasCostUSD
  } catch (error) {
    console.error("Error calculating gas cost:", error)
    return 0
  }
}
