"use client"

import { Bell, Menu, Search, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/layout/app-sidebar"

export function Topbar() {
  return (
    <div className="flex items-center gap-4 px-4 md:px-6 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <AppSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar conversas, pacientes, procedimentos..."
          className="pl-9 bg-input border-border"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificacoes">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <UserCircle className="w-5 h-5" />
              <span className="hidden md:inline text-sm">Conta</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Preferencias</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
