"use client"

import { useMemo, useState } from "react"
import { Virtuoso } from "react-virtuoso"
import { cn } from "@/utils/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Send, Bot, User, ArrowLeft } from "lucide-react"
import { API_BASE } from "@/services/api"
import { useConversationStore, useMessagesForSelected, useSelectedConversation } from "@/store/conversation-store"

interface ChatAreaProps {
  onToggleAi: (enabled: boolean) => void
  onSendMessage: (content: string) => void
  onBack?: () => void
}

export function ChatArea({ onToggleAi, onSendMessage, onBack }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState("")
  const selectedConversation = useSelectedConversation()
  const messages = useMessagesForSelected()
  const typing = useConversationStore((state) => state.typing)

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

  if (!selectedConversation) return null
  const { contactName, aiEnabled, stage } = selectedConversation

  const initials = contactName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const parseDate = (value: string) => {
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      return new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber)
    }
    return new Date(value)
  }

  const formatTime = (value: string) => {
    if (!value) return ""
    return parseDate(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  const messageMeta = useMemo(() => {
    return messages.map((message, index) => {
      const currentDate = parseDate(message.timestamp).toLocaleDateString("pt-BR")
      const prev = messages[index - 1]
      const prevDate = prev ? parseDate(prev.timestamp).toLocaleDateString("pt-BR") : null
      return {
        message,
        showDate: currentDate !== prevDate,
        dateLabel: currentDate,
      }
    })
  }, [messages])

  const renderMedia = (message: any) => {
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

  const stageLabel = stage ? stage.replace("_", " ") : null

  return (
    <div className="flex flex-col h-full bg-background">
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>WhatsApp</span>
              {stageLabel && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                  {stageLabel}
                </span>
              )}
            </div>
          </div>
        </div>

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

      <div className="flex-1 min-h-0">
        <Virtuoso
          data={messageMeta}
          itemContent={(_, item) => {
            const { message, showDate, dateLabel } = item
            const isOutgoing = message.sender === "user" || message.sender === "ai"
            const indicator =
              message.messageType === "ai" || message.sender === "ai"
                ? "IA"
                : message.messageType === "manual" || message.sender === "user"
                  ? "Humano"
                  : null

            return (
              <div className="px-6 py-3 space-y-4">
                {showDate && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-card border border-border">
                      {dateLabel}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div
                  className={cn(
                    "flex gap-3 max-w-[80%]",
                    isOutgoing ? "ml-auto flex-row-reverse" : ""
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
                      {indicator === "IA" && (
                        <Bot className="w-3 h-3 text-success" />
                      )}
                      {indicator === "Humano" && (
                        <User className="w-3 h-3 text-primary-foreground/70" />
                      )}
                      {indicator && (
                        <span className={cn(
                          "text-[10px]",
                          isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {indicator}
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px]",
                        isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          }}
          followOutput="auto"
        />
      </div>

      {typing && (
        <div className="px-6 pb-2 text-xs text-muted-foreground">Digitando...</div>
      )}

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
            A IA respondera automaticamente as mensagens recebidas
          </p>
        )}
      </div>
    </div>
  )
}
