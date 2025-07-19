"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TestTube, Eye, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useGasStore } from "@/lib/store"

interface SimulatedWallet {
  address: string
  privateKey: string
  balance: string
  provider: ethers.JsonRpcProvider
  signer: ethers.Wallet
}

export function WalletSimulator() {
  const [simulatedWallet, setSimulatedWallet] = useState<SimulatedWallet | null>(null)
  const [recipientAddress, setRecipientAddress] = useState("")
  const [sendAmount, setSendAmount] = useState("")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const { toast } = useToast()
  const { chains, ethUsdPrice } = useGasStore()

  // Create a simulated wallet with a dummy private key
  const createSimulatedWallet = async () => {
    try {
      // Use a deterministic private key for testing (DO NOT use in production)
      const privateKey = "0x1234567890123456789012345678901234567890123456789012345678901234"

      // Connect to Ethereum Mainnet via Alchemy
      const provider = new ethers.JsonRpcProvider(
        "https://eth-mainnet.g.alchemy.com/v2/3qVOcj8-5jRyYCwM3sm1xujVxHGpqJbm",
      )

      // Create wallet instance
      const wallet = new ethers.Wallet(privateKey, provider)
      const address = wallet.address

      // Get balance (will be 0 for this test wallet)
      const balance = await provider.getBalance(address)

      setSimulatedWallet({
        address,
        privateKey,
        balance: ethers.formatEther(balance),
        provider,
        signer: wallet,
      })

      toast({
        title: "Simulated Wallet Created",
        description: `Test wallet: ${address.slice(0, 6)}...${address.slice(-4)}`,
      })
    } catch (error) {
      console.error("Failed to create simulated wallet:", error)
      toast({
        title: "Error",
        description: "Failed to create simulated wallet",
        variant: "destructive",
      })
    }
  }

  // Simulate a transaction without actually sending it
  const simulateTransaction = async () => {
    if (!simulatedWallet || !recipientAddress || !sendAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsSimulating(true)
    try {
      const provider = simulatedWallet.provider

      // Validate recipient address
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error("Invalid recipient address")
      }

      // Parse amount
      const amountWei = ethers.parseEther(sendAmount)

      // Get current gas prices
      const feeData = await provider.getFeeData()
      const gasLimit = 21000n // Standard ETH transfer

      // Calculate gas costs
      const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits("20", "gwei")
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits("2", "gwei")

      const totalGasCost = gasLimit * maxFeePerGas
      const totalCost = amountWei + totalGasCost

      // Get current balance
      const currentBalance = await provider.getBalance(simulatedWallet.address)

      // Simulate the transaction
      const simulation = {
        from: simulatedWallet.address,
        to: recipientAddress,
        value: ethers.formatEther(amountWei),
        gasLimit: gasLimit.toString(),
        maxFeePerGas: ethers.formatUnits(maxFeePerGas, "gwei"),
        maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, "gwei"),
        gasCostETH: ethers.formatEther(totalGasCost),
        gasCostUSD: ethUsdPrice > 0 ? (Number(ethers.formatEther(totalGasCost)) * ethUsdPrice).toFixed(4) : "0",
        totalCostETH: ethers.formatEther(totalCost),
        currentBalanceETH: ethers.formatEther(currentBalance),
        canExecute: currentBalance >= totalCost,
        estimatedConfirmationTime: "~15 seconds",
      }

      setSimulationResult(simulation)

      toast({
        title: "Transaction Simulated",
        description: `Gas cost: $${simulation.gasCostUSD}`,
      })
    } catch (error: any) {
      console.error("Simulation failed:", error)
      toast({
        title: "Simulation Failed",
        description: error.message || "Failed to simulate transaction",
        variant: "destructive",
      })
    } finally {
      setIsSimulating(false)
    }
  }

  // Reset simulation
  const resetSimulation = () => {
    setSimulationResult(null)
    setRecipientAddress("")
    setSendAmount("")
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TestTube className="w-5 h-5" />
          Wallet Simulator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Wallet</TabsTrigger>
            <TabsTrigger value="simulate">Simulate Transaction</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            {!simulatedWallet ? (
              <div className="text-center space-y-4">
                <div className="flex items-center gap-2 text-yellow-400 justify-center">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">For testing purposes only</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Create a simulated wallet with a dummy private key for testing transactions
                </p>
                <Button onClick={createSimulatedWallet} className="w-full">
                  Create Test Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-white font-medium">Test Wallet Active</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Address:</span>
                    <span className="text-white font-mono text-sm">
                      {simulatedWallet.address.slice(0, 6)}...{simulatedWallet.address.slice(-4)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Balance:</span>
                    <span className="text-white font-medium">{Number(simulatedWallet.balance).toFixed(4)} ETH</span>
                  </div>
                </div>

                <Badge variant="outline" className="w-full justify-center">
                  Connected to Ethereum Mainnet
                </Badge>
              </div>
            )}
          </TabsContent>

          <TabsContent value="simulate" className="space-y-4">
            {!simulatedWallet ? (
              <div className="text-center text-slate-400">
                <p>Create a test wallet first to simulate transactions</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-slate-300">
                    Recipient Address
                  </Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-slate-300">
                    Amount (ETH)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    placeholder="0.1"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={simulateTransaction}
                    disabled={isSimulating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {isSimulating ? "Simulating..." : "Simulate Transaction"}
                  </Button>
                  {simulationResult && (
                    <Button onClick={resetSimulation} variant="outline" className="flex-1 bg-transparent">
                      Reset
                    </Button>
                  )}
                </div>

                {simulationResult && (
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg space-y-3">
                    <h4 className="text-white font-medium">Simulation Results</h4>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Amount:</span>
                        <div className="text-white font-medium">{simulationResult.value} ETH</div>
                      </div>

                      <div>
                        <span className="text-slate-400">Gas Cost:</span>
                        <div className="text-white font-medium">
                          {simulationResult.gasCostETH} ETH
                          <div className="text-green-400">${simulationResult.gasCostUSD}</div>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400">Max Fee:</span>
                        <div className="text-white font-medium">{simulationResult.maxFeePerGas} Gwei</div>
                      </div>

                      <div>
                        <span className="text-slate-400">Priority Fee:</span>
                        <div className="text-white font-medium">{simulationResult.maxPriorityFeePerGas} Gwei</div>
                      </div>

                      <div>
                        <span className="text-slate-400">Total Cost:</span>
                        <div className="text-white font-medium">{simulationResult.totalCostETH} ETH</div>
                      </div>

                      <div>
                        <span className="text-slate-400">Est. Time:</span>
                        <div className="text-white font-medium">{simulationResult.estimatedConfirmationTime}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-600">
                      <Badge
                        variant={simulationResult.canExecute ? "default" : "destructive"}
                        className="w-full justify-center"
                      >
                        {simulationResult.canExecute ? "✅ Transaction Valid" : "❌ Insufficient Balance"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
