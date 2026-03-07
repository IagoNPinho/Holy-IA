"use client"

import { useEffect, useState } from "react"
import { useEvents } from "@/hooks/use-events"

type ConnectionState = {
  qr: string | null
  connected: boolean
}

export function useWhatsAppConnection(): ConnectionState {
  const [qr, setQr] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const handleQr = (payload: { qr?: string }) => {
    if (payload?.qr) {
      setQr(payload.qr)
      setConnected(false)
    }
  }

  const handleReady = () => {
    setConnected(true)
    setQr(null)
  }

  useEvents("qr", handleQr)
  useEvents("ready", handleReady)
  useEvents("disconnected", () => setConnected(false))

  useEffect(() => {
    // keep stable initial state on mount
    setConnected(false)
  }, [])

  return { qr, connected }
}
