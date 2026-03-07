"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = window.localStorage.getItem("auth_token")
    if (!token) {
      router.replace("/login")
    }
  }, [router])

  return <>{children}</>
}
