"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/utils/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Send, Bot, User, ArrowLeft } from "lucide-react"
import { API_BASE } from "@/services/api"

export interface Message {
  id: string
  content: string
  sender: "user" | "contact" | "ai"
  timestamp: string
  messageType?: "incoming" | "manual" | "ai" | null
  mediaType?: string | null
  mediaUrl?: string | null
  mimeType?: string | null
}

interface ChatAreaProps {
  contactName: string
  messages: Message[]
  aiEnabled: boolean
  onToggleAi: (enabled: boolean) => void
  onSendMessage: (content: string) => void
  onBack?: () => void
}

export function ChatArea({
  contactName,
  messages,
  aiEnabled,
  onToggleAi,
  onSendMessage,
  onBack,
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const initials = contactName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const parseDate = (value: string) => {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      return new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber);
    }
    return new Date(value);
  };

  const groupedMessages = messages.reduce<{ date: string; items: Message[] }[]>((acc, message) => {
    const date = parseDate(message.timestamp).toLocaleDateString("pt-BR")
    const last = acc[acc.length - 1]
    if (!last || last.date !== date) {
      acc.push({ date, items: [message] })
    } else {
      last.items.push(message)
    }
    return acc
  }, [])

  const formatTime = (value: string) =>
    parseDate(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return
    const el = scrollRef.current
    el.scrollTop = el.scrollHeight
  }, [messages, autoScroll])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const nearBottom = scrollHeight - (scrollTop + clientHeight) < 120
    setAutoScroll(nearBottom)
  }

  const renderMedia = (message: Message) => {
    if (!message.mediaUrl) return null
    const src = `${API_BASE}${message.mediaUrl}`
    const isImage = message.mediaType === "image" || message.mimeType?.startsWith("image/")
    const isVideo = message.mediaType === "video" || message.mimeType?.startsWith("video/")
    const isAudio = message.mediaType === "audio" || message.mediaType === "ptt" || message.mimeType?.startsWith("audio/")

    if (isImage) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt="Imagem recebida" className="max-w-[260px] rounded-lg" />
    }
    if (isVideo) {
      return <video src={src} controls className="max-w-[260px] rounded-lg" />
    }
    if (isAudio) {
      return <audio src={src} controls className="w-[260px]" />
    }
    return (
      <a href={src} target="_blank" rel="noreferrer" className="text-xs underline">
        Baixar arquivo
      </a>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="md:hidden h-8 w-8 p-0"
            >
              <span className="sr-only">Voltar</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-accent text-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-foreground">{contactName}</h2>
            <p className="text-xs text-muted-foreground">WhatsApp</p>
          </div>
        </div>
        
        {/* AI Toggle */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            aiEnabled 
              ? "bg-success/20 text-success" 
              : "bg-muted text-muted-foreground"
          )}>
            <Bot className="w-4 h-4" />
            <span>{aiEnabled ? "IA Ativada" : "IA Desativada"}</span>
          </div>
          <Switch 
            checked={aiEnabled} 
            onCheckedChange={onToggleAi}
            className="data-[state=checked]:bg-success"
          />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {groupedMessages.map((group) => (
          <div key={group.date} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-card border border-border">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {group.items.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 max-w-[80%]",
                  message.sender === "user" || message.sender === "ai" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={cn(
                    "text-xs",
                    message.sender === "contact" 
                      ? "bg-accent text-accent-foreground" 
                      : message.sender === "ai"
                        ? "bg-success text-success-foreground"
                        : "bg-primary text-primary-foreground"
                  )}>
                    {message.sender === "contact" ? initials : message.sender === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "rounded-2xl px-4 py-2.5",
                  message.sender === "contact" 
                    ? "bg-card border border-border" 
                    : message.sender === "ai"
                      ? "bg-success/20 border border-success/30"
                      : "bg-primary text-primary-foreground"
                )}>
                  {renderMedia(message)}
                  {message.content ? (
                    <p className={cn(
                      "text-sm break-words whitespace-pre-wrap",
                      message.sender === "user" ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {message.content}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-1.5 mt-1">
                    {message.messageType === "ai" && (
                      <Bot className="w-3 h-3 text-success" />
                    )}
                    <span className={cn(
                      "text-[10px]",
                      message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card sticky bottom-0">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Digite sua mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
        {aiEnabled && (
          <p className="text-xs text-success mt-2 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            A IA responderÃ¡ automaticamente as mensagens recebidas
          </p>
        )}
      </div>
    </div>
  )
}

