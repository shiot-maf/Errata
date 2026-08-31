/**
 * 단어 단위 diff. 원문과 교정본을 나란히 보여주면서 무엇이 바뀌었는지
 * 색으로 표시하는 데 쓴다. LCS 기반이라 문장이 길어져도 결과가 안정적이다.
 */

export type DiffOp = "same" | "add" | "remove"

export interface DiffToken {
  op: DiffOp
  text: string
}

/** 단어와 그 뒤의 공백을 한 덩어리로 자른다 — 합칠 때 원래 간격이 복원된다. */
function tokenize(s: string): string[] {
  return s.match(/\S+\s*/g) ?? []
}

function key(token: string): string {
  return token.trim().toLowerCase().replace(/[.,!?;:'"]/g, "")
}

export function diffWords(before: string, after: string): DiffToken[] {
  const a = tokenize(before)
  const b = tokenize(after)

  // 아주 긴 텍스트에서 O(n*m) 표가 커지는 걸 막는다.
  if (a.length * b.length > 400_000) {
    return [
      { op: "remove", text: before },
      { op: "add", text: after },
    ]
  }

  const n = a.length
  const m = b.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        key(a[i]) === key(b[j])
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: DiffToken[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) {
      // 철자는 같아도 대소문자·구두점이 바뀌었으면 교정된 쪽을 보여준다.
      push(out, a[i] === b[j] ? "same" : "add", b[j])
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push(out, "remove", a[i++])
    } else {
      push(out, "add", b[j++])
    }
  }
  while (i < n) push(out, "remove", a[i++])
  while (j < m) push(out, "add", b[j++])

  return out
}

function push(out: DiffToken[], op: DiffOp, text: string) {
  const last = out[out.length - 1]
  if (last && last.op === op) last.text += text
  else out.push({ op, text })
}

/** 복습 퀴즈 채점용 — 대소문자·구두점·공백 차이는 봐준다. */
export function answersMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,!?;:'"’]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  return norm(a) === norm(b)
}
