"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, ExternalLink, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WalletState {
  isConnected: boolean
  address: string
  balance: string
  chainId: number
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
}

export function WalletConnector() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: "",
    balance: "0",
    chainId: 0,
    provider: null,
    signer: null,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()

        if (accounts.length > 0) {
          const signer = await provider.getSigner()
          const address = await signer.getAddress()
          const balance = await provider.getBalance(address)
          const network = await provider.getNetwork()

          setWallet({
            isConnected: true,
            address,
            balance: ethers.formatEther(balance),
            chainId: Number(network.chainId),
            provider,
            signer,
          })
        }
      } catch (error) {
        console.error("Error checking connection:", error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to connect your wallet.",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const balance = await provider.getBalance(address)
      const network = await provider.getNetwork()

      // Check if connected to Ethereum Mainnet
      if (Number(network.chainId) !== 1) {
        toast({
          title: "Wrong Network",
          description: "Please switch to Ethereum Mainnet (Chain ID: 1)",
          variant: "destructive",
        })

        // Try to switch to Ethereum Mainnet
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x1" }], // Ethereum Mainnet
          })
        } catch (switchError: any) {
          console.error("Failed to switch network:", switchError)
        }
        return
      }

      setWallet({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        provider,
        signer,
      })

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      })
    } catch (error: any) {
      console.error("Connection failed:", error)
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWallet({
      isConnected: false,
      address: "",
      balance: "0",
      chainId: 0,
      provider: null,
      signer: null,
    })
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  const copyAddress = async () => {
    if (wallet.address) {
      await navigator.clipboard.writeText(wallet.address)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return "Ethereum Mainnet"
      case 5:
        return "Goerli Testnet"
      case 11155111:
        return "Sepolia Testnet"
      default:
        return `Chain ID: ${chainId}`
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wallet className="w-5 h-5" />
          Wallet Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!wallet.isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-slate-300 text-sm">Connect your MetaMask wallet to interact with Ethereum Mainnet</p>
            <Button onClick={connectWallet} disabled={isConnecting} className="w-full bg-blue-600 hover:bg-blue-700">
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-white font-medium">Connected</span>
              </div>
              <Badge variant="secondary" className={wallet.chainId === 1 ? "bg-green-600" : "bg-yellow-600"}>
                {getNetworkName(wallet.chainId)}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Address:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyAddress} className="h-6 w-6 p-0">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Balance:</span>
                <span className="text-white font-medium">{Number(wallet.balance).toFixed(4)} ETH</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://etherscan.io/address/${wallet.address}`, "_blank")}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Etherscan
              </Button>
              <Button variant="destructive" size="sm" onClick={disconnectWallet} className="flex-1">
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
