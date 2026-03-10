"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/utils/utils"
import { ConversationList } from "@/modules/conversations/components/conversation-list"
import { ChatArea } from "@/modules/conversations/components/chat-area"
import { EmptyChat } from "@/modules/conversations/components/empty-chat"
import { Button } from "@/components/ui/button"
import { request } from "@/services/api"
import { useWhatsAppConnection } from "@/hooks/use-whatsapp-connection"
import { WhatsAppConnector } from "@/modules/whatsapp/components/whatsapp-connector"
import { useEvents } from "@/hooks/use-events"
import { useConversationList, useConversationStore, useSelectedConversation } from "@/store/conversation-store"
import type { Message } from "@/store/conversation-store"

type ConversationApi = {
  id: number
  name: string | null
  ai_enabled: number | null
  unread_count?: number | null
  last_message: string | null
  updated_at: string | null
  resolved_at?: string | null
}

type MessageApi = {
  id: number
  from_me?: number
  body: string
  timestamp: string
  message_type?: "incoming" | "manual" | "ai" | null
  media_type?: string | null
  media_url?: string | null
  mime_type?: string | null
  intent?: string | null
}

export default function DashboardPage() {
  const selectedConversation = useSelectedConversation()
  const conversationList = useConversationList()
  const setConversations = useConversationStore((state) => state.setConversations)
  const setMessages = useConversationStore((state) => state.setMessages)
  const upsertConversation = useConversationStore((state) => state.upsertConversation)
  const selectedId = useConversationStore((state) => state.selectedId)
  const refreshTimerRef = useRef<number | null>(null)
  const listLengthRef = useRef<number>(0)

  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const { qr, connected } = useWhatsAppConnection()

  useEffect(() => {
    listLengthRef.current = conversationList.length
  }, [conversationList.length])

  useEffect(() => {
    let isActive = true
    const loadStatuses = async () => {
      try {
        const aiResult = await request<{ enabled: boolean }>("/ai/status")
        if (!isActive) return
        setAiEnabled(aiResult.enabled)
      } catch (err) {
        console.error(err)
      }
    }

    loadStatuses()
    const interval = setInterval(loadStatuses, 15000)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [])

  const formatContactName = useCallback((name: string | null) => {
    const trimmed = (name || "").trim()
    if (!trimmed) return "Contato sem nome"
    const cleaned = trimmed.replace(/@c\.us$/i, "").replace(/@g\.us$/i, "")
    return cleaned || "Contato sem nome"
  }, [])

  const refreshConversations = useCallback(async (limitOverride?: number) => {
    const currentLength = listLengthRef.current || 0
    const limit = Math.max(limitOverride || 50, currentLength || 50)
    const res = await request<{ data: ConversationApi[] }>(
      `/conversations?limit=${limit}&offset=0`
    )
    const mapped = res.data.map((item) => ({
      id: String(item.id),
      contactName: formatContactName(item.name),
      lastMessage: item.last_message || "",
      timestamp: item.updated_at || "",
      unread: item.unread_count || 0,
      aiEnabled: item.ai_enabled === null || item.ai_enabled === undefined ? true : Boolean(item.ai_enabled),
      resolvedAt: item.resolved_at || null,
    }))
    setConversations(mapped)
  }, [formatContactName, setConversations])

  const loadInitialConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      await refreshConversations(50)
      setConversationsError(null)
    } catch (err) {
      setConversationsError("Não foi possível carregar as conversas. Verifique sua sessão.")
      console.error(err)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [refreshConversations])

  const scheduleConversationsRefresh = useCallback(() => {
    if (refreshTimerRef.current) return
    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null
      try {
        await refreshConversations()
        setConversationsError(null)
      } catch (err) {
        console.error(err)
      }
    }, 500)
  }, [refreshConversations])

  useEffect(() => {
    let isActive = true
    const loadConversations = async () => {
      if (!isActive) return
      await loadInitialConversations()
    }
    loadConversations()
    const interval = setInterval(async () => {
      try {
        await refreshConversations()
      } catch (err) {
        console.error(err)
      }
    }, 60000)
    return () => {
      isActive = false
      clearInterval(interval)
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }
    }
  }, [loadInitialConversations, refreshConversations])

  const handleLoadMore = async () => {
    if (isLoadingMore) return
    const nextOffset = conversationList.length
    setIsLoadingMore(true)
    try {
      const res = await request<{ data: ConversationApi[] }>(
        `/conversations?limit=50&offset=${nextOffset}`
      )
      const mapped = res.data.map((item) => ({
        id: String(item.id),
        contactName: formatContactName(item.name),
        lastMessage: item.last_message || "",
        timestamp: item.updated_at || "",
        unread: item.unread_count || 0,
        aiEnabled: item.ai_enabled === null || item.ai_enabled === undefined ? true : Boolean(item.ai_enabled),
        resolvedAt: item.resolved_at || null,
      }))
      setConversations([...conversationList, ...mapped])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const refreshMessages = useCallback(async (conversationId: string) => {
    const res = await request<{ data: MessageApi[] }>(`/messages/${conversationId}?limit=100`)
    const mapped: Message[] = res.data
      .slice()
      .reverse()
      .map((item) => ({
        id: String(item.id),
        conversationId,
        content: item.body,
        sender: (() => {
          if (item.message_type === "ai") return "ai"
          if (item.message_type === "manual") return "user"
          if (item.message_type === "incoming") return "contact"
          return item.from_me ? "user" : "contact"
        })(),
        timestamp: item.timestamp,
        messageType: item.message_type || (item.from_me ? "manual" : "incoming"),
        mediaType: item.media_type || null,
        mediaUrl: item.media_url || null,
        mimeType: item.mime_type || null,
      }))
    setMessages(conversationId, mapped)
  }, [setMessages])

  useEffect(() => {
    let isActive = true
    const loadMessages = async () => {
      if (!selectedId) return
      try {
        await refreshMessages(selectedId)
        if (!isActive) return
      } catch (err) {
        console.error(err)
      }
    }
    loadMessages()
    return () => {
      isActive = false
    }
  }, [selectedId, refreshMessages])

  const handleMessageEvent = useCallback(
    async (payload?: { conversationId?: number | string }) => {
      scheduleConversationsRefresh()
      const targetId = payload?.conversationId ? String(payload.conversationId) : null
      if (targetId && targetId === selectedId) {
        await refreshMessages(targetId)
      }
    },
    [refreshMessages, scheduleConversationsRefresh, selectedId]
  )

  const handleConversationEvent = useCallback(
    async (payload?: { conversationId?: number | string }) => {
      scheduleConversationsRefresh()
      const targetId = payload?.conversationId ? String(payload.conversationId) : null
      if (targetId && targetId === selectedId) {
        await refreshMessages(targetId)
      }
    },
    [refreshMessages, scheduleConversationsRefresh, selectedId]
  )

  useEvents("message_received", handleMessageEvent)
  useEvents("message_sent", handleMessageEvent)
  useEvents("conversation_updated", handleConversationEvent)

  useEffect(() => {
    if (selectedId) setMobileView("chat")
  }, [selectedId])

  const handleBackToList = () => {
    setMobileView("list")
  }

  const handleToggleAi = async (enabled: boolean) => {
    if (!selectedConversation) return
    try {
      const res = await request<{ ok: boolean; aiEnabled: boolean }>(
        `/conversations/${selectedConversation.id}/ai-toggle`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        }
      )
      upsertConversation({ ...selectedConversation, aiEnabled: res.aiEnabled })
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return
    try {
      await request<{ ok: boolean }>("/messages/send", {
        method: "POST",
        body: JSON.stringify({ conversationId: selectedConversation.id, body: content }),
      })
      await refreshMessages(selectedConversation.id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={cn(
          "w-full md:w-[30%] md:min-w-[280px] md:max-w-[400px] h-full",
          mobileView === "chat" ? "hidden md:block" : "block"
        )}
      >
        <div className="flex flex-col h-full">
          {conversationsError && (
            <div className="px-4 py-2 text-xs text-destructive border-b border-border bg-card">
              {conversationsError}
            </div>
          )}
          <div className="flex-1">
            <ConversationList
              isLoading={isLoadingConversations}
            />
          </div>
          <div className="p-3 border-t border-border bg-card">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full"
            >
              {isLoadingMore ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex-1 h-full min-h-0 flex flex-col",
          mobileView === "list" ? "hidden md:flex" : "flex"
        )}
      >
        <div className="flex items-center justify-end px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              IA: {aiEnabled ? "Ativada" : "Desativada"}
            </span>
            <span className="text-xs text-muted-foreground">
              WhatsApp: {connected ? "Conectado" : "Aguardando QR"}
            </span>
          </div>
        </div>

        {!connected && (
          <div className="px-6 py-4 border-b border-border bg-background">
            <WhatsAppConnector qr={qr} connected={connected} />
          </div>
        )}

        {selectedConversation ? (
          <ChatArea onToggleAi={handleToggleAi} onSendMessage={handleSendMessage} onBack={handleBackToList} />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  )
}





