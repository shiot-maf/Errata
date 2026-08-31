"use client"

import { useCallback, type KeyboardEvent } from "react"

/**
 * radiogroup의 화살표 키 이동.
 *
 * ARIA에서 라디오 그룹은 Tab으로 항목 사이를 옮기지 않는다. 그룹 전체가
 * 탭 정지점 하나이고, 안에서는 화살표로 움직인다(roving tabindex). 그래서
 * `tabIndex={선택된 것만 0}`만 해두고 키 처리를 빼먹으면, 키보드 사용자는
 * 그룹에 들어갈 수는 있어도 값을 바꿀 방법이 없어진다.
 *
 * 그룹 컨테이너의 onKeyDown에 붙인다. 선택을 바꾸면서 포커스도 같이 옮긴다.
 */
export function useRadioGroupKeys(
  count: number,
  index: number,
  onChange: (next: number) => void,
) {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (count === 0) return

      let next: number
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (index + 1) % count
          break
        case "ArrowLeft":
        case "ArrowUp":
          next = (index - 1 + count) % count
          break
        case "Home":
          next = 0
          break
        case "End":
          next = count - 1
          break
        default:
          return
      }

      // 화살표는 원래 스크롤에 쓰인다. 그룹 안에서는 우리가 가져간다.
      event.preventDefault()
      onChange(next)

      const radios = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')
      radios[next]?.focus()
    },
    [count, index, onChange],
  )
}
