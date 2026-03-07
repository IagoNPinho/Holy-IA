"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { request } from "@/services/api"
import { MessageSquare, Users, Bot, CalendarCheck } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import { format, subDays } from "date-fns"

type MetricsResponse = {
  messages_today?: number
  active_conversations?: number
  ai_messages?: number
  appointments_suggested?: number
  messages_per_day?: { day: string; messages: number }[]
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

  const chartData = useMemo(() => {
    if (metrics?.messages_per_day?.length) {
      return metrics.messages_per_day
    }
    return Array.from({ length: 7 }).map((_, index) => {
      const date = subDays(new Date(), 6 - index)
      return {
        day: format(date, "dd/MM"),
        messages: 0,
      }
    })
  }, [metrics])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do atendimento e operação do Holy AI.
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
              {metrics?.appointments_suggested ?? "--"}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground text-sm">Mensagens por dia</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
