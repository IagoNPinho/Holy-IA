"use client"

import { WhatsAppConnector } from "@/modules/whatsapp/components/whatsapp-connector"
import { useWhatsAppConnection } from "@/hooks/use-whatsapp-connection"

export default function WhatsAppPage() {
  const { qr, connected } = useWhatsAppConnection()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a conexão e status do WhatsApp.
          </p>
        </div>

        <div className="border border-border rounded-lg bg-card p-6">
          <WhatsAppConnector qr={qr} connected={connected} />
        </div>
      </div>
    </div>
  )
}
