import { MessageSquare } from "lucide-react"

export function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border mb-4">
        <MessageSquare className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        Nenhuma conversa selecionada
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Selecione uma conversa na lista ao lado para visualizar as mensagens e interagir com o cliente.
      </p>
    </div>
  )
}
