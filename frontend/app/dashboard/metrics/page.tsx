"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { request } from "@/lib/api"

type MetricsResponse = {
  messages_today: number
  ai_messages: number
  manual_messages: number
  active_conversations: number
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request<MetricsResponse>("/metrics")
        setMetrics(res)
      } catch (error) {
        console.error(error)
      }
    }
    load()
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Métricas</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o volume de mensagens e atendimento.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Mensagens hoje</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.messages_today ?? "--"}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Mensagens IA</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.ai_messages ?? "--"}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Mensagens manuais</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.manual_messages ?? "--"}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Conversas ativas</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.active_conversations ?? "--"}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
