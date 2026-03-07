"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { request } from "@/services/api"

type MetricsResponse = {
  messages_today: number
  ai_messages: number
  manual_messages: number
  active_conversations: number
  leads_today: number
  avg_response_time_seconds: number
  ai_vs_manual_ratio: number
  media_messages_today: number
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
          <h1 className="text-2xl font-semibold text-foreground">MÃ©tricas</h1>
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
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Leads hoje</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.leads_today ?? "--"}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Tempo mÃƒÂ©dio resposta (s)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.avg_response_time_seconds ?? "--"}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">AI / Manual</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.ai_vs_manual_ratio ? metrics.ai_vs_manual_ratio.toFixed(2) : "--"}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">MÃƒÂ­dias hoje</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.media_messages_today ?? "--"}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

