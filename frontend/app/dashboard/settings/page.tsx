"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, Building2, MessageSquare, Clock, CheckCircle } from "lucide-react"
import { request } from "@/lib/api"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [settings, setSettings] = useState({
    clinicName: "",
    voiceTone: "professional",
    procedures: "",
    workingHours: "",
    confirmationMessage: "",
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request<{ clinicSettings: typeof settings }>("/settings")
        setSettings(res.clinicSettings)
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    setSaved(false)

    try {
      await request("/clinic-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configuracoes</h1>
          <p className="text-muted-foreground mt-1">
            Configure as informacoes da sua clinica e personalize o atendimento da IA.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-foreground">Informacoes da Clinica</CardTitle>
            </div>
            <CardDescription>Dados basicos sobre sua clinica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName" className="text-foreground">Nome da Clinica</Label>
              <Input
                id="clinicName"
                value={settings.clinicName}
                onChange={(e) => setSettings(prev => ({ ...prev, clinicName: e.target.value }))}
                placeholder="Nome da sua clinica"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-foreground">Personalizacao da IA</CardTitle>
            </div>
            <CardDescription>Configure como a IA deve se comunicar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voiceTone" className="text-foreground">Tom de Voz</Label>
              <Select 
                value={settings.voiceTone} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, voiceTone: value }))}
              >
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Selecione o tom de voz" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="friendly">Amigavel</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="procedures" className="text-foreground">Procedimentos Oferecidos</Label>
              <Textarea
                id="procedures"
                value={settings.procedures}
                onChange={(e) => setSettings(prev => ({ ...prev, procedures: e.target.value }))}
                placeholder="Liste os procedimentos (um por linha)"
                rows={4}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Informe os procedimentos para que a IA possa orientar os pacientes corretamente.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-foreground">Horarios e Mensagens</CardTitle>
            </div>
            <CardDescription>Configure horarios e mensagens automaticas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workingHours" className="text-foreground">Horario de Atendimento</Label>
              <Textarea
                id="workingHours"
                value={settings.workingHours}
                onChange={(e) => setSettings(prev => ({ ...prev, workingHours: e.target.value }))}
                placeholder="Ex: Segunda a Sexta: 08:00 - 18:00"
                rows={3}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmationMessage" className="text-foreground">Mensagem de Confirmacao</Label>
              <Textarea
                id="confirmationMessage"
                value={settings.confirmationMessage}
                onChange={(e) => setSettings(prev => ({ ...prev, confirmationMessage: e.target.value }))}
                placeholder="Mensagem enviada ao confirmar consultas"
                rows={3}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {'Use {data} e {horario} para inserir dinamicamente a data e horario da consulta.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-4">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle className="w-4 h-4" />
              Configuracoes salvas com sucesso!
            </span>
          )}
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Salvando..." : "Salvar Configuracoes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
