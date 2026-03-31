import type { ReactNode } from 'react'

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function buildStrippedCharToOrigIndex(haystack: string): { stripped: string; origCharIndex: number[] } {
  const origCharIndex: number[] = []
  let stripped = ''
  for (let i = 0; i < haystack.length; i++) {
    const seg = stripAccents(haystack[i]!.toLowerCase())
    if (seg.length === 0) continue
    for (let k = 0; k < seg.length; k++) {
      stripped += seg[k]!
      origCharIndex.push(i)
    }
  }
  return { stripped, origCharIndex }
}

/**
 * Highlight đoạn khớp query (bỏ dấu, không phân biệt hoa thường) trong snippet.
 */
export function highlightSearchSnippet(snippet: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return snippet

  const { stripped, origCharIndex } = buildStrippedCharToOrigIndex(snippet)
  const n = stripAccents(q.toLowerCase())
  const si = stripped.toLowerCase().indexOf(n)
  if (si < 0) {
    const j = snippet.toLowerCase().indexOf(q.toLowerCase())
    if (j < 0) return snippet
    return (
      <>
        {snippet.slice(0, j)}
        <mark className="rounded-sm bg-transparent font-semibold text-[#0068ff]">{snippet.slice(j, j + q.length)}</mark>
        {snippet.slice(j + q.length)}
      </>
    )
  }

  const endSt = si + n.length - 1
  const startOrig = origCharIndex[si] ?? 0
  const endOrig = origCharIndex[endSt] ?? startOrig

  const before = snippet.slice(0, startOrig)
  const match = snippet.slice(startOrig, endOrig + 1)
  const after = snippet.slice(endOrig + 1)

  return (
    <>
      {before}
      <mark className="rounded-sm bg-transparent font-semibold text-[#0068ff]">{match}</mark>
      {after}
    </>
  )
}
