import { AppSidebar } from "@/components/layout/app-sidebar"
import { AuthGuard } from "@/components/layout/auth-guard"
import { Topbar } from "@/components/layout/topbar"
import { EventProvider } from "@/components/layout/event-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <EventProvider>
        <div className="flex h-screen bg-background overflow-hidden">
          <div className="hidden md:flex">
            <AppSidebar />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </EventProvider>
    </AuthGuard>
  )
}
