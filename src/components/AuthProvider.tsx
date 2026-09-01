"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { onAuthChange } from "@/lib/firebase/auth"
import { ensureProfile } from "@/lib/firebase/db"
import { isDemo } from "@/lib/demo/store"
import { useBrowserValue } from "@/lib/browserStore"
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
  // 데모 여부는 주소(?demo=1)와 sessionStorage에 있다. 정적 HTML을 구울 때는
  // 알 수 없는 값이라 브라우저에서 읽는다.
  const demo = useBrowserValue(isDemo, false)

  const [authUser, setAuthUser] = useState<AppUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loadedProfile, setLoadedProfile] = useState<UserProfile | null>(null)

  // 데모 사용자는 상태가 아니라 계산해서 낸다. 효과 안에서 setState로 채우면
  // 렌더가 한 번 더 돌고, 로그아웃 상태가 잠깐 스쳐 지나간다.
  const user = demo ? DEMO_USER : authUser
  const loading = demo ? false : !authReady
  const profile = user ? loadedProfile : null

  useEffect(() => {
    // 데모 모드에서는 Firebase를 아예 건드리지 않는다.
    if (demo) return

    return onAuthChange((u) => {
      setAuthUser(
        u
          ? {
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
              photoURL: u.photoURL,
            }
          : null,
      )
      setAuthReady(true)
    })
  }, [demo])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ensureProfile(user)
      .then((p) => {
        if (!cancelled) setLoadedProfile(p)
      })
      .catch((err) => {
        console.error("프로필을 불러오지 못했습니다:", err)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const refreshProfile = async () => {
    if (!user) return
    setLoadedProfile(await ensureProfile(user))
  }

  return (
    <Ctx.Provider value={{ user, profile, loading, demo, refreshProfile }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
