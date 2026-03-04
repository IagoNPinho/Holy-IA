"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ConversationList, type Conversation } from "@/components/conversation-list"
import { ChatArea, type Message } from "@/components/chat-area"
import { EmptyChat } from "@/components/empty-chat"
import { Button } from "@/components/ui/button"
import { request } from "@/lib/api"
import QRCode from "qrcode"

type ConversationApi = {
  id: number
  name: string | null
  ai_enabled: number | null
  unread_count?: number | null
  last_message: string | null
  updated_at: string | null
}

type MessageApi = {
  id: number
  from_me?: number
  body: string
  timestamp: string
  message_type?: "incoming" | "manual" | "ai" | null
}

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [conversationsOffset, setConversationsOffset] = useState<number>(0)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [whatsappStatus, setWhatsappStatus] = useState<string>("disconnected")
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrRefreshing, setQrRefreshing] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")

  const selectedConversation = useMemo(
    () => conversations.find(c => c.id === selectedId),
    [conversations, selectedId]
  )
  const selectedMessages = selectedId ? messages[selectedId] || [] : []

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return bt - at
    })
  }, [conversations])

  useEffect(() => {
    let isActive = true
    const loadStatuses = async () => {
      try {
        const [aiResult, waResult] = await Promise.allSettled([
          request<{ enabled: boolean }>("/ai/status"),
          request<{ status: string }>("/whatsapp/status"),
        ])

        if (!isActive) return

        if (aiResult.status === "fulfilled") {
          setAiEnabled(aiResult.value.enabled)
        }

        if (waResult.status === "fulfilled") {
          setWhatsappStatus(waResult.value.status)
        }
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

  useEffect(() => {
    let isActive = true
    const loadConversations = async () => {
      setIsLoading(true)
      try {
        const res = await request<{ data: ConversationApi[] }>(
          "/conversations?limit=20&offset=0"
        )
        if (!isActive) return
        const mapped = res.data.map(item => ({
          id: String(item.id),
          contactName: item.name || "",
          lastMessage: item.last_message || "",
          timestamp: item.updated_at || "",
          unread: false,
          aiEnabled: item.ai_enabled === null || item.ai_enabled === undefined ? true : Boolean(item.ai_enabled),
        }))
        setConversations(mapped)
        setConversationsOffset(mapped.length)
        setConversationsError(null)
      } catch (err) {
        setConversationsError("Não foi possível carregar as conversas. Verifique sua sessão.")
        console.error(err)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadConversations()
    const interval = setInterval(async () => {
      try {
        const res = await request<{ data: ConversationApi[] }>(
          "/conversations?limit=20&offset=0"
        )
        if (!isActive) return
        const mapped = res.data.map(item => ({
          id: String(item.id),
          contactName: item.name || "",
          lastMessage: item.last_message || "",
          timestamp: item.updated_at || "",
          unread: false,
          aiEnabled: item.ai_enabled === null || item.ai_enabled === undefined ? true : Boolean(item.ai_enabled),
        }))
        setConversations(prev => {
          const byId = new Map(prev.map(c => [c.id, c]))
          const incomingIds = new Set(mapped.map(c => c.id))
          const mergedTop = mapped.map(c => ({ ...byId.get(c.id), ...c }))
          const rest = prev.filter(c => !incomingIds.has(c.id))
          return [...mergedTop, ...rest]
        })
        setConversationsOffset(prev => Math.max(prev, mapped.length))
      } catch (err) {
        console.error(err)
      }
    }, 8000)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [])

  const handleLoadMore = async () => {
    if (isLoadingMore) return
    const nextOffset = conversations.length
    setIsLoadingMore(true)
    try {
      const res = await request<{ data: ConversationApi[] }>(
        `/conversations?limit=20&offset=${nextOffset}`
      )
      const mapped = res.data.map(item => ({
        id: String(item.id),
        contactName: item.name || "",
        lastMessage: item.last_message || "",
        timestamp: item.updated_at || "",
        unread: false,
        aiEnabled: item.ai_enabled === null || item.ai_enabled === undefined ? true : Boolean(item.ai_enabled),
      }))
      setConversations(prev => [...prev, ...mapped])
      setConversationsOffset(nextOffset + mapped.length)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    let isActive = true
    const loadMessages = async () => {
      if (!selectedId) return
      try {
        const res = await request<{ data: MessageApi[] }>(`/messages/${selectedId}?limit=100`)
        if (!isActive) return
        const mapped: Message[] = res.data
          .slice()
          .reverse()
          .map(item => ({
            id: String(item.id),
            content: item.body,
            sender:
              item.message_type === "ai"
                ? "ai"
                : item.message_type === "manual"
                  ? "user"
                  : "contact",
            timestamp: item.timestamp,
            messageType: item.message_type || null,
          }))
        setMessages(prev => ({ ...prev, [selectedId]: mapped }))
      } catch (err) {
        console.error(err)
      }
    }
    loadMessages()
    const interval = setInterval(loadMessages, 5000)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [selectedId])

  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    setMobileView("chat")
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, unread: false } : c)
    )
  }

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
      setConversations(prev =>
        prev.map(c => (c.id === selectedConversation.id ? { ...c, aiEnabled: res.aiEnabled } : c))
      )
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
      const res = await request<{ data: MessageApi[] }>(
        `/messages/${selectedConversation.id}?limit=100`
      )
      const mapped: Message[] = res.data
        .slice()
        .reverse()
        .map(item => ({
          id: String(item.id),
          content: item.body,
          sender:
            item.message_type === "ai"
              ? "ai"
              : item.message_type === "manual"
                ? "user"
                : "contact",
          timestamp: item.timestamp,
          messageType: item.message_type || null,
        }))
      setMessages(prev => ({ ...prev, [selectedConversation.id]: mapped }))
    } catch (err) {
      console.error(err)
    }
  }

  const refreshQr = useCallback(async () => {
    if (qrRefreshing) return
    setQrError(null)
    setQrDataUrl(null)
    setQrRefreshing(true)
    try {
      const res = await request<{ qr: string }>("/whatsapp/qr")
      const dataUrl = await QRCode.toDataURL(res.qr)
      setQrDataUrl(dataUrl)
    } catch (err) {
      setQrError("QR ainda nao disponivel. Aguarde o backend gerar.")
    } finally {
      setQrRefreshing(false)
    }
  }, [qrRefreshing])

  const handleOpenQr = async () => {
    await refreshQr()
  }

  useEffect(() => {
    let isActive = true
    const poll = async () => {
      try {
        const res = await request<{ status: string }>("/whatsapp/status")
        if (!isActive) return
        setWhatsappStatus(res.status)
        if (res.status === "not_authenticated") {
          await refreshQr()
        } else if (res.status === "ready") {
          setQrDataUrl(null)
          setQrError(null)
        }
      } catch (err) {
        console.error(err)
      }
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [refreshQr])

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
              conversations={sortedConversations}
              selectedId={selectedId}
              onSelect={handleSelectConversation}
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
            {whatsappStatus === "not_authenticated" && (
              <Button variant="outline" onClick={handleOpenQr}>
                Conectar WhatsApp
              </Button>
            )}
          </div>
        </div>

        {whatsappStatus === "not_authenticated" && (
          <div className="px-6 py-4 border-b border-border bg-background">
            <div className="flex items-center gap-4">
              <div className="w-40 h-40 bg-card border border-border rounded-md flex items-center justify-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="QR Code WhatsApp" className="w-36 h-36" />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-2">
                    {qrError || "Gerando QR..."}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Abra o WhatsApp no celular e escaneie o QR para conectar.
              </div>
            </div>
          </div>
        )}

        {selectedConversation ? (
          <ChatArea
            contactName={selectedConversation.contactName}
            messages={selectedMessages}
            aiEnabled={selectedConversation.aiEnabled ?? false}
            onToggleAi={handleToggleAi}
            onSendMessage={handleSendMessage}
            onBack={handleBackToList}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  )
}
