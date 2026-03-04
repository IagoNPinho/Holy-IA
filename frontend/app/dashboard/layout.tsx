import { AppSidebar } from "@/components/app-sidebar"
import { AuthGuard } from "@/components/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        <div className="hidden md:flex">
          <AppSidebar />
        </div>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
