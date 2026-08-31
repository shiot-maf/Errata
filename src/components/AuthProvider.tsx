"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { onAuthChange } from "@/lib/firebase/auth"
import { ensureProfile } from "@/lib/firebase/db"
import { isDemo } from "@/lib/demo/store"
import type { UserProfile } from "@/lib/types"

/**
 * 앱이 실제로 쓰는 사용자 정보만 추린 타입.
 * Firebase의 User를 그대로 흘리지 않아서 데모 모드가 가짜 사용자를 끼워 넣을 수 있고,
 * 나중에 인증 수단을 바꿔도 화면 코드는 그대로 둘 수 있다.
 */
export interface AppUser {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

interface AuthValue {
  user: AppUser | null
  profile: UserProfile | null
  loading: boolean
  demo: boolean
  refreshProfile: () => Promise<void>
}

const DEMO_USER: AppUser = {
  uid: "demo-user",
  displayName: "데모 사용자",
  email: "demo@errata.app",
  photoURL: null,
}

const Ctx = createContext<AuthValue>({
  user: null,
  profile: null,
  loading: true,
  demo: false,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    // 데모 모드에서는 Firebase를 아예 건드리지 않는다.
    if (isDemo()) {
      setDemo(true)
      setUser(DEMO_USER)
      void ensureProfile(DEMO_USER).then(setProfile)
      setLoading(false)
      return
    }

    return onAuthChange(async (u) => {
      const next: AppUser | null = u
        ? {
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
          }
        : null
      setUser(next)

      if (next) {
        try {
          setProfile(await ensureProfile(next))
        } catch (err) {
          console.error("프로필을 불러오지 못했습니다:", err)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  const refreshProfile = async () => {
    if (!user) return
    setProfile(await ensureProfile(user))
  }

  return (
    <Ctx.Provider value={{ user, profile, loading, demo, refreshProfile }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
