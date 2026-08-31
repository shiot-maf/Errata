"use client"

/**
 * 테마.
 *
 * 기본은 "system" — 기기 설정을 따른다. 명시적으로 고르면 html의 data-theme에
 * 박히고, CSS가 그걸 보고 media query보다 우선해서 색을 바꾼다.
 *
 * 저장은 localStorage에만 한다. 로그인 전에도 동작해야 하고, 기기마다 다르게
 * 두고 싶을 수 있어서 계정에 붙이지 않았다.
 */

export type Theme = "system" | "light" | "dark"

export const THEME_KEY = "errata.theme"

export function getTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const v = window.localStorage.getItem(THEME_KEY)
  return v === "light" || v === "dark" ? v : "system"
}

export function setTheme(theme: Theme): void {
  if (typeof window === "undefined") return
  if (theme === "system") {
    window.localStorage.removeItem(THEME_KEY)
    document.documentElement.removeAttribute("data-theme")
  } else {
    window.localStorage.setItem(THEME_KEY, theme)
    document.documentElement.setAttribute("data-theme", theme)
  }
}

/**
 * 첫 페인트 전에 실행돼야 하는 스크립트.
 * React가 렌더되기를 기다리면 밝은 화면이 한 번 번쩍인다.
 */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`
