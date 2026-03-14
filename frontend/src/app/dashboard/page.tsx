"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/utils/utils"
import { ConversationList } from "@/modules/conversations/components/conversation-list"
import { ChatArea } from "@/modules/conversations/components/chat-area"
import { EmptyChat } from "@/modules/conversations/components/empty-chat"
import { Button } from "@/components/ui/button"
import { request } from "@/services/api"
import { useEvents } from "@/hooks/use-events"
import { useConversationList, useConversationStore, useSelectedConversation, useMessageMetaForSelected } from "@/store/conversation-store"
import type { Message } from "@/store/conversation-store"

type ConversationApi = {
  id: number | string
  contactName: string
  lastMessage: string
  timestamp: string
  unread: number
  aiEnabled: boolean
  status?: string
}

type MessageApi = {
  id: number | string
  conversationId: number | string
  content: string
  sender: "user" | "contact" | "ai"
  timestamp: string
  messageType?: "incoming" | "manual" | "ai" | null
  status?: string | null
}

export default function DashboardPage() {
  const selectedConversation = useSelectedConversation()
  const conversationList = useConversationList()
  const setConversations = useConversationStore((state) => state.setConversations)
  const setMessages = useConversationStore((state) => state.setMessages)
  const addMessages = useConversationStore((state) => state.addMessages)
  const setMessageMeta = useConversationStore((state) => state.setMessageMeta)
  const upsertConversation = useConversationStore((state) => state.upsertConversation)
  const addMessage = useConversationStore((state) => state.addMessage)
  const selectedId = useConversationStore((state) => state.selectedId)
  const refreshTimerRef = useRef<number | null>(null)
  const listLengthRef = useRef<number>(0)
  const selectedMeta = useMessageMetaForSelected()

  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const connected = true
  const messagesLimit = 50

  useEffect(() => {
    listLengthRef.current = conversationList.length
  }, [conversationList.length])

  useEffect(() => {
    setAiEnabled(true)
  }, [])

  const formatContactName = useCallback((name: string | null) => {
    const trimmed = (name || "").trim()
    if (!trimmed) return "Contato sem nome"
    const cleaned = trimmed
      .replace(/@c\.us$/i, "")
      .replace(/@g\.us$/i, "")
      .replace(/@lid$/i, "")
    if (!cleaned) return "Contato sem nome"
    if (cleaned.includes("@")) {
      const [head] = cleaned.split("@")
      return head || "Contato sem nome"
    }
    return cleaned || "Contato sem nome"
  }, [])

  const refreshConversations = useCallback(async (limitOverride?: number) => {
    const currentLength = listLengthRef.current || 0
    const limit = Math.max(limitOverride || 50, currentLength || 50)
    const res = await request<{ data: ConversationApi[] }>(
      `/api/conversations?limit=${limit}&offset=0`
    )
    const mapped = res.data.map((item) => ({
      id: String(item.id),
      contactName: formatContactName(item.contactName),
      lastMessage: item.lastMessage || "",
      timestamp: item.timestamp || "",
      unread: item.unread || 0,
      aiEnabled: item.aiEnabled ?? true,
      resolvedAt: null,
      status: item.status,
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
        `/api/conversations?limit=50&offset=${nextOffset}`
      )
      const mapped = res.data.map((item) => ({
        id: String(item.id),
        contactName: formatContactName(item.contactName),
        lastMessage: item.lastMessage || "",
        timestamp: item.timestamp || "",
        unread: item.unread || 0,
        aiEnabled: item.aiEnabled ?? true,
        resolvedAt: null,
        status: item.status,
      }))
      setConversations([...conversationList, ...mapped])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const refreshMessages = useCallback(async (conversationId: string, reason: string) => {
    console.debug("[CHAT_FETCH] refreshMessages called", { conversationId, reason })
    const res = await request<{
      data: MessageApi[]
    }>(`/api/conversations/${conversationId}/messages?limit=${messagesLimit}`)
    const mapped: Message[] = res.data
      .slice()
      .reverse()
      .map((item) => ({
        id: String(item.id),
        conversationId,
        content: item.content || "",
        sender: item.sender || "contact",
        timestamp: item.timestamp,
        messageType: item.messageType || (item.sender === "ai" ? "ai" : "incoming"),
        mediaType: null,
        mediaUrl: null,
        mimeType: null,
        mediaFilename: null,
        whatsappMessageId: null,
      }))
    setMessages(conversationId, mapped)
    const meta = {
      oldestCursor: mapped.length ? mapped[0].timestamp : null,
      hasMoreDb: false,
      backfillAvailable: false,
      backfillExhausted: true,
    }
    setMessageMeta(conversationId, meta)
    console.debug("[HISTORY] response meta", { conversationId, ...meta })
  }, [messagesLimit, setMessageMeta, setMessages])

  const loadOlderMessages = useCallback(async (_conversationId: string) => {
    return
  }, [])

  useEffect(() => {
    let isActive = true
    const loadMessages = async () => {
      if (!selectedId) return
      try {
        console.debug("[CHAT_FETCH] selectedId changed", { conversationId: selectedId })
        await refreshMessages(selectedId, "selectedId_change")
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
    async (eventType: "message_received" | "message_sent", payload?: any) => {
      const targetId = payload?.conversation?.id || payload?.conversationId
      const message = payload?.message
      console.debug("[SSE]", eventType, {
        conversationId: String(targetId || ""),
        messageId: message?.id || null,
        hasMessage: Boolean(message),
        hasConversation: Boolean(payload?.conversation),
      })
      if (message) {
        addMessage({
          id: String(message.id),
          conversationId: String(message.conversationId || targetId),
          content: message.content || "",
          sender: message.sender || (message.messageType === "ai" ? "ai" : message.from_me ? "user" : "contact"),
          timestamp: message.timestamp || "",
          messageType: message.messageType || (message.sender === "ai" ? "ai" : "incoming"),
          mediaType: message.mediaType || null,
          mediaUrl: message.mediaUrl || null,
          mimeType: message.mimeType || null,
          mediaFilename: message.mediaFilename || null,
          whatsappMessageId: message.whatsappMessageId || null,
        })
        console.debug("[SSE] store_patch_message", {
          conversationId: String(targetId || ""),
          messageId: message.id || null,
        })
      }
      if (payload?.conversation) {
        const nextConversation = targetId === selectedId
          ? { ...payload.conversation, unread: 0 }
          : payload.conversation
        upsertConversation({
          id: String(nextConversation.id),
          contactName: nextConversation.contactName || "Contato sem nome",
          lastMessage: nextConversation.lastMessage || "",
          timestamp: nextConversation.timestamp || "",
          unread: nextConversation.unread || 0,
          aiEnabled: nextConversation.aiEnabled ?? true,
          resolvedAt: nextConversation.resolvedAt || null,
        })
        console.debug("[SSE] store_patch_conversation", { conversationId: String(nextConversation.id) })
      } else if (targetId) {
        scheduleConversationsRefresh()
      }
      if (targetId && String(targetId) === selectedId && !message && !payload?.conversation) {
        console.debug("[CHAT_FETCH] skip refreshMessages from SSE", {
          reason: "message_event_no_payload",
          conversationId: String(targetId),
        })
      }
    },
    [addMessage, refreshMessages, scheduleConversationsRefresh, selectedId, upsertConversation]
  )

  const handleConversationEvent = useCallback(
    async (payload?: any) => {
      const targetId = payload?.conversation?.id || payload?.conversationId
      console.debug("[SSE] conversation_updated", {
        conversationId: String(targetId || ""),
        hasConversation: Boolean(payload?.conversation),
      })
      if (payload?.conversation) {
        upsertConversation({
          id: String(payload.conversation.id),
          contactName: payload.conversation.contactName || "Contato sem nome",
          lastMessage: payload.conversation.lastMessage || "",
          timestamp: payload.conversation.timestamp || "",
          unread: payload.conversation.unread || 0,
          aiEnabled: payload.conversation.aiEnabled ?? true,
          resolvedAt: payload.conversation.resolvedAt || null,
        })
      } else if (payload?.lastMessage || payload?.updatedAt) {
        upsertConversation({
          id: String(targetId),
          lastMessage: payload.lastMessage || "",
          timestamp: payload.updatedAt || "",
        } as any)
        console.debug("[SSE] store_patch_conversation_min", { conversationId: String(targetId || "") })
      } else {
        scheduleConversationsRefresh()
      }
      if (targetId && String(targetId) === selectedId && !payload?.conversation && !payload?.lastMessage && !payload?.updatedAt) {
        console.debug("[CHAT_FETCH] skip refreshMessages from SSE", {
          reason: "conversation_event_no_payload",
          conversationId: String(targetId),
        })
      }
    },
    [refreshMessages, scheduleConversationsRefresh, selectedId, upsertConversation]
  )

  useEvents("message_received", (payload) => handleMessageEvent("message_received", payload))
  useEvents("message_sent", (payload) => handleMessageEvent("message_sent", payload))
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
        `/api/conversations/${selectedConversation.id}/ai-toggle`,
        {
          method: "POST",
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
      await request<{ ok: boolean }>(`/api/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: content }),
      })
      console.debug("[CHAT_FETCH] skip refreshMessages after send", { conversationId: selectedConversation.id })
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

        {/* Inbox Lite mode: no legacy QR/status UI */}

        {selectedConversation ? (
          <ChatArea
            onToggleAi={handleToggleAi}
            onSendMessage={handleSendMessage}
            onBack={handleBackToList}
            onLoadOlder={() => selectedConversation && loadOlderMessages(selectedConversation.id)}
            canLoadOlder={Boolean(
              selectedConversation &&
              (selectedMeta?.hasMoreDb ||
                (selectedMeta?.backfillAvailable && !selectedMeta?.backfillExhausted))
            )}
            isLoadingOlder={isLoadingOlder}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  )
}





