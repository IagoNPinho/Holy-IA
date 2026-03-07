"use client"

import { useContext, useEffect } from "react"
import { EventContext } from "@/components/layout/event-provider"

type EventHandler<T = any> = (payload: T) => void

export function useEvents<T = any>(eventType: string, handler: EventHandler<T>) {
  const ctx = useContext(EventContext)

  useEffect(() => {
    if (!ctx) return
    return ctx.subscribe(eventType, handler)
  }, [ctx, eventType, handler])
}

