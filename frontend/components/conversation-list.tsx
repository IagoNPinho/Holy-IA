"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export interface Conversation {
  id: string
  contactName: string
  contactId?: string
  lastMessage: string
  timestamp: string
  unread?: boolean
  aiEnabled?: boolean
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar conversas..." 
            className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-border",
              selectedId === conversation.id
                ? "bg-secondary"
                : "hover:bg-secondary/50"
            )}
          >
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                {conversation.contactName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "font-medium truncate text-foreground",
                  conversation.unread && "font-semibold"
                )}>
                  {conversation.contactName}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {conversation.timestamp}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={cn(
                  "text-sm truncate",
                  conversation.unread ? "text-foreground" : "text-muted-foreground"
                )}>
                  {conversation.lastMessage}
                </p>
                {conversation.aiEnabled && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-success/20 text-success">
                    IA
                  </span>
                )}
              </div>
            </div>
            {conversation.unread && (
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
