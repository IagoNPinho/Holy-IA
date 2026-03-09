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
    if (payload?.qr && !connected) {
      setQr(payload.qr)
      setConnected(false)
    }
  }

  const handleReady = () => {
    setConnected(true)
    setQr(null)
  }

  const refreshStatus = useCallback(async (includeQr: boolean) => {
    try {
      const status = await request<{ status: string }>("/whatsapp/status")
      if (status?.status === "ready" || status?.status === "authenticated") {
        setConnected(true)
        setQr(null)
        return
      }
      setConnected(false)
    } catch (error) {
      console.error(error)
    }

    if (!includeQr) return

    try {
      const result = await request<{ qr?: string }>("/whatsapp/qr")
      if (result?.qr) {
        setQr(result.qr)
      }
    } catch {
      // ignore missing QR
    }
  }, [])

  useEvents("qr", handleQr)
  useEvents("ready", handleReady)
  useEvents("disconnected", () => {
    setConnected(false)
    setQr(null)
  })

  useEffect(() => {
    // keep stable initial state on mount
    setConnected(false)
    if (!hasBootstrapped) {
      refreshStatus(true).finally(() => setHasBootstrapped(true))
    }
  }, [hasBootstrapped, refreshStatus])

  useEffect(() => {
    if (connected) return
    const interval = window.setInterval(() => {
      refreshStatus(true)
    }, 12000)
    return () => {
      window.clearInterval(interval)
    }
  }, [connected, refreshStatus])

  return { qr, connected }
}
