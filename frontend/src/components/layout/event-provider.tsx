"use client"

import React, { createContext, useCallback, useEffect, useMemo, useRef } from "react"
import { API_BASE } from "@/services/api"

type EventHandler<T = any> = (payload: T) => void

type EventContextValue = {
  subscribe: (eventType: string, handler: EventHandler) => () => void
}

const EventContext = createContext<EventContextValue | null>(null)

type ListenerMap = Map<string, Set<EventHandler>>

export function EventProvider({ children }: { children: React.ReactNode }) {
  const sourceRef = useRef<EventSource | null>(null)
  const listenersRef = useRef<ListenerMap>(new Map())
  const reconnectRef = useRef<number | null>(null)
  const connectingRef = useRef(false)

  const subscribe = useCallback((eventType: string, handler: EventHandler) => {
    const listeners = listenersRef.current
    const set = listeners.get(eventType) || new Set()
    set.add(handler)
    listeners.set(eventType, set)

    return () => {
      const current = listeners.get(eventType)
      if (!current) return
      current.delete(handler)
      if (current.size === 0) listeners.delete(eventType)
    }
  }, [])

  const dispatch = useCallback((eventType: string, payload: any) => {
    const handlers = listenersRef.current.get(eventType)
    if (!handlers) return
    handlers.forEach((handler) => {
      try {
        handler(payload)
      } catch {
        // ignore handler errors to avoid breaking SSE loop
      }
    })
  }, [])

  const connect = useCallback(() => {
    if (connectingRef.current || sourceRef.current) return
    const token = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null
    if (!token) return

    connectingRef.current = true
    const source = new EventSource(`${API_BASE}/events?token=${encodeURIComponent(token)}`)
    sourceRef.current = source

    const routeEvent = (eventType: string, data: string) => {
      try {
        const payload = JSON.parse(data)
        dispatch(eventType, payload)
      } catch {
        // ignore parse errors
      }
    }

    source.onmessage = (event) => routeEvent("message", event.data)
    source.addEventListener("qr", (event) => routeEvent("qr", event.data))
    source.addEventListener("ready", (event) => routeEvent("ready", event.data))
    source.addEventListener("disconnected", (event) => routeEvent("disconnected", event.data))
    source.addEventListener("message_received", (event) => routeEvent("message_received", event.data))
    source.addEventListener("message_sent", (event) => routeEvent("message_sent", event.data))
    source.addEventListener("conversation_updated", (event) => routeEvent("conversation_updated", event.data))

    source.onerror = () => {
      source.close()
      sourceRef.current = null
      connectingRef.current = false
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current)
      }
      reconnectRef.current = window.setTimeout(() => {
        reconnectRef.current = null
        connect()
      }, 2000)
    }

    source.onopen = () => {
      connectingRef.current = false
    }
  }, [dispatch])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current)
      sourceRef.current?.close()
      sourceRef.current = null
      connectingRef.current = false
    }
  }, [connect])

  const value = useMemo<EventContextValue>(() => ({ subscribe }), [subscribe])

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>
}

export { EventContext }

