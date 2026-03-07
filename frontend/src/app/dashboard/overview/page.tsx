"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { request } from "@/services/api"
import { MessageSquare, Users, Bot, CalendarCheck } from "lucide-react"

type MetricsResponse = {
  messages_today: number
  active_conversations: number
  ai_messages: number
}

export default function DashboardOverviewPage() {
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
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            VisÃ£o geral do atendimento e operaÃ§Ã£o do Holy AI.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground text-sm">Conversas hoje</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.messages_today ?? "--"}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground text-sm">Leads ativos</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.active_conversations ?? "--"}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground text-sm">Respostas IA</CardTitle>
              <Bot className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              {metrics?.ai_messages ?? "--"}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground text-sm">Agendamentos sugeridos</CardTitle>
              <CalendarCheck className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">
              --
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
