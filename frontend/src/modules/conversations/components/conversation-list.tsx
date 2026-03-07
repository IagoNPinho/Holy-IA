"use client"

import { useMemo, useState } from "react"
import { Virtuoso } from "react-virtuoso"
import { cn } from "@/utils/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useConversationList, useConversationStore } from "@/store/conversation-store"

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

export function ConversationList() {
  const [query, setQuery] = useState("")
  const conversations = useConversationList()
  const selectedId = useConversationStore((state) => state.selectedId)
  const selectConversation = useConversationStore((state) => state.selectConversation)

  const formatTimestamp = (value: string) => {
    if (!value) return ""
    const date = new Date(value)
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
        <Virtuoso
          data={filtered}
          itemContent={(_, conversation) => (
            <button
              key={conversation.id}
              onClick={() => selectConversation(conversation.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-border",
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
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatTimestamp(conversation.timestamp)}
                  </span>
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
              {conversation.unread > 0 && (
                <div className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                  {Math.min(conversation.unread || 1, 99)}
                </div>
              )}
            </button>
          )}
        />
      </div>
    </div>
  )
}
