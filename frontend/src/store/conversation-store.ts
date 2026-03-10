"use client"

import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"

export type ConversationStage = "NEW" | "WAITING" | "IN_PROGRESS" | "SCHEDULED" | "CLIENT"

export type Conversation = {
  id: string
  contactName: string
  lastMessage: string
  timestamp: string
  unread: number
  aiEnabled: boolean
  stage?: ConversationStage
  resolvedAt?: string | null
}

export type Message = {
  id: string
  conversationId: string
  content: string
  sender: "user" | "contact" | "ai"
  timestamp: string
  messageType?: "incoming" | "manual" | "ai" | null
  mediaType?: string | null
  mediaUrl?: string | null
  mimeType?: string | null
  mediaFilename?: string | null
  whatsappMessageId?: string | null
}

type State = {
  conversations: Record<string, Conversation>
  order: string[]
  messages: Record<string, Message[]>
  selectedId: string | null
  typing: boolean
  setConversations: (list: Conversation[]) => void
  upsertConversation: (c: Conversation) => void
  setMessages: (conversationId: string, list: Message[]) => void
  addMessage: (message: Message) => void
  addMessages: (conversationId: string, list: Message[], opts?: { prepend?: boolean }) => void
  selectConversation: (id: string) => void
  setTyping: (value: boolean) => void
}

const EMPTY_MESSAGES: Message[] = []

function sortOrder(list: Conversation[]) {
  return [...list].sort((a, b) => {
    const at = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0
    return bt - at
  })
}

export const useConversationStore = create<State>((set, get) => ({
  conversations: {},
  order: [],
  messages: {},
  selectedId: null,
  typing: false,
  setConversations: (list) =>
    set(() => {
      const sorted = sortOrder(list)
      const map: Record<string, Conversation> = {}
      const order = sorted.map((c) => {
        map[c.id] = c
        return c.id
      })
      return { conversations: map, order }
    }),
  upsertConversation: (c) =>
    set((state) => {
      const conversations = { ...state.conversations, [c.id]: { ...state.conversations[c.id], ...c } }
      const without = state.order.filter((id) => id !== c.id)
      const order = [c.id, ...without]
      return { conversations, order }
    }),
  setMessages: (conversationId, list) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: list },
    })),
  addMessage: (message) =>
    set((state) => {
      const list = state.messages[message.conversationId] || []
      const exists = list.some((m) =>
        (message.whatsappMessageId && m.whatsappMessageId === message.whatsappMessageId) ||
        m.id === message.id
      )
      const updated = exists ? list : [...list, message]
      return { messages: { ...state.messages, [message.conversationId]: updated } }
    }),
  addMessages: (conversationId, list, opts) =>
    set((state) => {
      const current = state.messages[conversationId] || []
      if (!list.length) return state
      const merged = opts?.prepend ? [...list, ...current] : [...current, ...list]
      const deduped: Message[] = []
      const seen = new Set<string>()
      for (const msg of merged) {
        const key = msg.whatsappMessageId ? `wa:${msg.whatsappMessageId}` : `id:${msg.id}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(msg)
      }
      return { messages: { ...state.messages, [conversationId]: deduped } }
    }),
  selectConversation: (id) =>
    set((state) => {
      const convo = state.conversations[id]
      if (!convo) return { selectedId: id }
      return {
        selectedId: id,
        conversations: {
          ...state.conversations,
          [id]: { ...convo, unread: 0 },
        },
      }
    }),
  setTyping: (value) => set({ typing: value }),
}))

export const useConversationList = () =>
  useConversationStore(
    useShallow((state: State) => state.order.map((id) => state.conversations[id]))
  )

export const useSelectedConversation = () =>
  useConversationStore((state) => (state.selectedId ? state.conversations[state.selectedId] : null))

export const useMessagesForSelected = () =>
  useConversationStore(
    useShallow((state: State) => (state.selectedId ? state.messages[state.selectedId] || EMPTY_MESSAGES : EMPTY_MESSAGES))
  )
