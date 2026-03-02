"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Send, Bot, User } from "lucide-react"

export interface Message {
  id: string
  content: string
  sender: "user" | "contact" | "ai"
  timestamp: string
}

interface ChatAreaProps {
  contactName: string
  messages: Message[]
  aiEnabled: boolean
  onToggleAi: (enabled: boolean) => void
  onSendMessage: (content: string) => void
}

export function ChatArea({ contactName, messages, aiEnabled, onToggleAi, onSendMessage }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState("")

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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
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
              <p className={cn(
                "text-sm",
                message.sender === "user" ? "text-primary-foreground" : "text-foreground"
              )}>
                {message.content}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {message.sender === "ai" && (
                  <Bot className="w-3 h-3 text-success" />
                )}
                <span className={cn(
                  "text-[10px]",
                  message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {message.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
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
            A IA responderá automaticamente as mensagens recebidas
          </p>
        )}
      </div>
    </div>
  )
}
