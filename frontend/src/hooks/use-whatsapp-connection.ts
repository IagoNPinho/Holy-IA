"use client"

import { useCallback, useEffect, useState } from "react"
import { useEvents } from "@/hooks/use-events"
import { request } from "@/services/api"

type ConnectionState = {
  qr: string | null
  connected: boolean
}

export function useWhatsAppConnection(): ConnectionState {
  const [qr, setQr] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [hasBootstrapped, setHasBootstrapped] = useState(false)
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

  const bootstrapStatus = useCallback(async () => {
    try {
      const status = await request<{ status: string }>("/whatsapp/status")
      if (status?.status === "ready" || status?.status === "authenticated") {
        setConnected(true)
        setQr(null)
      } else {
        setConnected(false)
      }
    } catch (error) {
      console.error(error)
    }

    try {
      const result = await request<{ qr?: string }>("/whatsapp/qr")
      if (result?.qr) {
        setQr(result.qr)
      }
    } catch {
      // ignore missing QR
    } finally {
      setHasBootstrapped(true)
    }
  }, [])

  useEvents("qr", handleQr)
  useEvents("ready", handleReady)
  useEvents("disconnected", () => setConnected(false))

  useEffect(() => {
    // keep stable initial state on mount
    setConnected(false)
    if (!hasBootstrapped) {
      bootstrapStatus()
    }
  }, [bootstrapStatus, hasBootstrapped])

  return { qr, connected }
}
