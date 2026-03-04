"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Settings, LogOut, MessageSquare, BarChart3, Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { request } from "@/lib/api"
import { useState } from "react"

const navigation = [
  { name: "Conversas", href: "/dashboard", icon: LayoutDashboard },
  { name: "Configuracoes", href: "/dashboard/settings", icon: Settings },
  { name: "Metricas", href: "/dashboard/metrics", icon: BarChart3 },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)

  const handleLogout = () => {
    window.localStorage.removeItem("auth_token")
    router.push("/login")
  }

  const handleDisconnect = async () => {
    if (disconnecting) return
    setDisconnecting(true)
    try {
      await request("/whatsapp/disconnect", { method: "POST" })
    } catch (error) {
      console.error(error)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <aside className="flex flex-col w-64 h-screen bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
          <MessageSquare className="w-4 h-4 text-accent-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">Holy AI</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          onClick={handleDisconnect}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
          disabled={disconnecting}
        >
          <Plug className="w-4 h-4" />
          {disconnecting ? "Desconectando..." : "Desconectar WhatsApp"}
        </Button>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
