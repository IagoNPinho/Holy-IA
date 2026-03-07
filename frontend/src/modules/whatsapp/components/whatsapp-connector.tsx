"use client"

import { QRCodeCanvas } from "qrcode.react"

type WhatsAppConnectorProps = {
  qr: string | null
  connected: boolean
}

export function WhatsAppConnector({ qr, connected }: WhatsAppConnectorProps) {

  if (connected) {
    return (
      <div className="text-sm text-success">
        Conectado
      </div>
    )
  }

  if (!qr) {
    return (
      <div className="text-sm text-muted-foreground">
        Gerando QR...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-40 h-40 bg-card border border-border rounded-md flex items-center justify-center">
        <QRCodeCanvas value={qr} size={144} />
      </div>
      <div className="text-sm text-muted-foreground">
        Abra o WhatsApp no celular e escaneie o QR para conectar.
      </div>
    </div>
  )
}
