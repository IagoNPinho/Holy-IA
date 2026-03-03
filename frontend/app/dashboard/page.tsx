"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ConversationList, type Conversation } from "@/components/conversation-list"
import { ChatArea, type Message } from "@/components/chat-area"
import { EmptyChat } from "@/components/empty-chat"
import { Button } from "@/components/ui/button"
import { API_BASE, request } from "@/lib/api"
import QRCode from "qrcode"

type ConversationApi = {
  id: number
  contact_id: string
  name: string | null
  last_message: string | null
  updated_at: string | null
}

type MessageApi = {
  id: number
  from_me: number
  body: string
  timestamp: string
}

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [whatsappStatus, setWhatsappStatus] = useState<string>("disconnected")
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrRefreshing, setQrRefreshing] = useState(false)

  const selectedConversation = useMemo(
    () => conversations.find(c => c.id === selectedId),
    [conversations, selectedId]
  )
  const selectedMessages = selectedId ? messages[selectedId] || [] : []

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const aiStatus = await request<{ enabled: boolean }>("/ai/status")
        setAiEnabled(aiStatus.enabled)
        const res = await request<{ data: ConversationApi[] }>("/conversations")
        const mapped = res.data.map(item => ({
          id: String(item.id),
          contactId: item.contact_id,
          contactName: item.name || item.contact_id,
          lastMessage: item.last_message || "",
          timestamp: item.updated_at ? new Date(item.updated_at).toLocaleString("pt-BR") : "",
          unread: false,
          aiEnabled: aiStatus.enabled,
        }))
        setConversations(mapped)
        const waStatus = await request<{ status: string }>("/whatsapp/status")
        setWhatsappStatus(waStatus.status)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedId) return
      try {
        const res = await request<{ data: MessageApi[] }>(`/messages/${selectedId}`)
        const mapped: Message[] = res.data.map(item => ({
          id: String(item.id),
          content: item.body,
          sender: item.from_me ? "ai" : "contact",
          timestamp: new Date(item.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        }))
        setMessages(prev => ({ ...prev, [selectedId]: mapped }))
      } catch (err) {
        console.error(err)
      }
    }
    loadMessages()
  }, [selectedId])

  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, unread: false } : c)
    )
  }

  const handleToggleAi = async (enabled: boolean) => {
    try {
      const res = await request<{ aiEnabled: boolean }>("/toggle-ia", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      })
      setAiEnabled(res.aiEnabled)
      setConversations(prev =>
        prev.map(c => ({ ...c, aiEnabled: res.aiEnabled }))
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
        body: JSON.stringify({ to: selectedConversation.contactId || selectedConversation.contactName, body: content }),
      })
      const res = await request<{ data: MessageApi[] }>(`/messages/${selectedConversation.id}`)
      const mapped: Message[] = res.data.map(item => ({
        id: String(item.id),
        content: item.body,
        sender: item.from_me ? "ai" : "contact",
        timestamp: new Date(item.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
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

  const handleDisconnect = async () => {
    try {
      const res = await request<{ status: string }>("/whatsapp/disconnect", { method: "POST" })
      setWhatsappStatus(res.status)
    } catch (err) {
      console.error(err)
    }
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
    <div className="flex h-full">
      <div className="w-[30%] min-w-[280px] max-w-[400px]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
        />
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `API: ${API_BASE}`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              IA: {aiEnabled ? "Ativada" : "Desativada"}
            </span>
            {whatsappStatus === "ready" && (
              <>
                <span className="text-xs text-success font-medium">
                  WhatsApp conectado
                </span>
                <Button variant="outline" onClick={handleDisconnect}>
                  Desconectar WhatsApp
                </Button>
              </>
            )}
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
            aiEnabled={aiEnabled}
            onToggleAi={handleToggleAi}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  )
}
