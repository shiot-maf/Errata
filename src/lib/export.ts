import type { Entry, Mistake, SavedItem, UserProfile } from "./types"
import { getCategory } from "./taxonomy"
import { formatKoFull } from "./dates"

/**
 * 내보내기. 이 앱이 사라져도 내가 쓴 글과 쌓인 실수 데이터는 내 손에 남아야 한다.
 * JSON은 다시 불러오기용, 마크다운은 사람이 읽는 용도.
 */

export interface Backup {
  format: "errata-backup"
  version: 1
  exportedAt: string
  profile: UserProfile | null
  entries: Entry[]
  mistakes: Mistake[]
  saved: SavedItem[]
}

export function buildBackup(data: {
  profile: UserProfile | null
  entries: Entry[]
  mistakes: Mistake[]
  saved: SavedItem[]
}): Backup {
  return {
    format: "errata-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  }
}

export function buildMarkdown(entries: Entry[], mistakes: Mistake[]): string {
  const byEntry = new Map<string, Mistake[]>()
  for (const m of mistakes) {
    byEntry.set(m.entryId, [...(byEntry.get(m.entryId) ?? []), m])
  }

  const sorted = [...entries].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const lines: string[] = ["# ERRATA", ""]

  for (const e of sorted) {
    lines.push(`## ${formatKoFull(e.dateKey)}`, "")
    lines.push(e.text.trim(), "")

    if (e.feedback) {
      lines.push("### 교정본", "", e.feedback.correctedText.trim(), "")
      if (e.feedback.overallComment) {
        lines.push(`> ${e.feedback.overallComment}`, "")
      }
      const list = byEntry.get(e.id) ?? []
      if (list.length > 0) {
        lines.push("### 지적된 실수", "")
        for (const m of list) {
          lines.push(
            `- **[${getCategory(m.category).ko}]** \`${m.original}\` → \`${m.corrected}\``,
          )
          if (m.explanation) lines.push(`  - ${m.explanation}`)
        }
        lines.push("")
      }
    }
    lines.push("---", "")
  }

  return lines.join("\n")
}

/** 브라우저에서 파일로 저장 */
export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 즉시 해제하면 사파리에서 저장이 중단되는 경우가 있어 한 틱 미룬다.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
