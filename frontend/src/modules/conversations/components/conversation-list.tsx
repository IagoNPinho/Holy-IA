"use client"

import { useMemo, useState } from "react"
import { Virtuoso } from "react-virtuoso"
import { cn } from "@/utils/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search, Bell, Send, CheckCircle } from "lucide-react"
import { useConversationList, useConversationStore } from "@/store/conversation-store"
import { request } from "@/services/api"

const stageColor = (stage?: string) => {
  switch (stage) {
    case "NEW":
      return "bg-emerald-500/15 text-emerald-400"
    case "WAITING":
      return "bg-yellow-500/15 text-yellow-400"
    case "IN_PROGRESS":
      return "bg-blue-500/15 text-blue-400"
    case "SCHEDULED":
      return "bg-purple-500/15 text-purple-400"
    case "CLIENT":
      return "bg-slate-500/15 text-slate-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

type ConversationListProps = {
  isLoading?: boolean
}

export function ConversationList({ isLoading }: ConversationListProps) {
  const [query, setQuery] = useState("")
  const conversations = useConversationList()
  const selectedId = useConversationStore((state) => state.selectedId)
  const selectConversation = useConversationStore((state) => state.selectConversation)
  const upsertConversation = useConversationStore((state) => state.upsertConversation)

  const parseTimestamp = (value: string) => {
    if (!value) return null
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      return new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber)
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value.replace(" ", "T") + "Z")
    }
    return new Date(value)
  }

  const formatTimestamp = (value: string) => {
    if (!value) return ""
    const date = parseTimestamp(value)
    if (!date) return ""
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((item) =>
      item.contactName.toLowerCase().includes(q) ||
      item.lastMessage.toLowerCase().includes(q)
    )
  }, [conversations, query])

  const getAlertLabel = (timestamp: string, unread: number, resolvedAt?: string | null) => {
    if (!timestamp || unread === 0 || resolvedAt) return null
    const ts = parseTimestamp(timestamp)?.getTime() || NaN
    if (Number.isNaN(ts)) return null
    const hours = (Date.now() - ts) / 36e5
    if (hours >= 24) return "24h"
    if (hours >= 12) return "12h"
    if (hours >= 6) return "6h"
    return null
  }

  const alertColor = (label: string) => {
    if (label === "24h") return "bg-red-500/15 text-red-400"
    if (label === "12h") return "bg-orange-500/15 text-orange-400"
    return "bg-yellow-500/15 text-yellow-400"
  }

  const handleScheduleFollowup = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await request("/followups/schedule", {
        method: "POST",
        body: JSON.stringify({ conversationId }),
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleSendReminder = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await request("/followups/remind", {
        method: "POST",
        body: JSON.stringify({ conversationId }),
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleResolve = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await request(`/conversations/${conversationId}/resolve`, {
        method: "PATCH",
      })
      upsertConversation({
        id: conversationId,
        resolvedAt: new Date().toISOString(),
        unread: 0,
      } as any)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 border-b border-border sticky top-0 z-10 bg-inherit">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
            {isLoading ? "Carregando conversas..." : "Nenhuma conversa encontrada"}
          </div>
        ) : (
          <Virtuoso
            data={filtered}
            itemContent={(_, conversation) => (
              <button
                key={conversation.id}
                onClick={() => selectConversation(conversation.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-border group",
                  selectedId === conversation.id
                    ? "bg-secondary"
                    : "hover:bg-secondary/50"
                )}
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                    {conversation.contactName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "font-medium truncate text-foreground",
                      conversation.unread > 0 && "font-semibold"
                    )}>
                      {conversation.contactName}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(() => {
                        const label = getAlertLabel(
                          conversation.timestamp,
                          conversation.unread,
                          conversation.resolvedAt
                        )
                        return label ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            alertColor(label)
                          )}>
                            {label}
                          </span>
                        ) : null
                      })()}
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={cn(
                      "text-sm truncate",
                      conversation.unread > 0 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {conversation.lastMessage}
                    </p>
                    {conversation.aiEnabled && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-success/20 text-success">
                        IA
                      </span>
                    )}
                    {conversation.stage && (
                      <span className={cn(
                        "flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded",
                        stageColor(conversation.stage)
                      )}>
                        {conversation.stage}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conversation.unread > 0 && (
                    <div className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                      {Math.min(conversation.unread || 1, 99)}
                    </div>
                  )}
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => handleScheduleFollowup(conversation.id, event)}
                      className="h-7 w-7 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
                      title="Agendar follow-up"
                    >
                      <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleSendReminder(conversation.id, event)}
                      className="h-7 w-7 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
                      title="Enviar lembrete"
                    >
                      <Send className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleResolve(conversation.id, event)}
                      className="h-7 w-7 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
                      title="Marcar como resolvida"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </button>
            )}
          />
        )}
      </div>
    </div>
  )
}
