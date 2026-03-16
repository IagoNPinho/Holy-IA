"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { API_BASE } from "@/services/api"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [checked, setChecked] = useState<boolean>(false)

  useEffect(() => {
    let active = true

    const verify = async () => {
      const token = window.localStorage.getItem("auth_token")
      if (!token) {
        if (active) {
          setAuthorized(false)
          setChecked(true)
        }
        router.replace("/login")
        return
      }

      try {
        const res = await fetch(`${API_BASE}/api/conversations?limit=1&offset=0`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) {
          throw new Error(`auth failed: ${res.status}`)
        }
        if (active) {
          setAuthorized(true)
          setChecked(true)
        }
      } catch {
        window.localStorage.removeItem("auth_token")
        if (active) {
          setAuthorized(false)
          setChecked(true)
        }
        router.replace("/login")
      }
    }

    verify()

    return () => {
      active = false
    }
  }, [router])

  if (!checked || !authorized) {
    return null
  }

  return <>{children}</>
}
