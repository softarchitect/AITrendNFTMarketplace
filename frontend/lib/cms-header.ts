export interface CmsHeaderExtractionResult {
  title?: string
  lastUpdated?: string
  content: string
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

function cleanupContent(input: string): string {
  return input.replace(/^\s+/, "").replace(/\s+$/, "")
}

function extractFromHtml(content: string): CmsHeaderExtractionResult {
  let next = content
  let title: string | undefined
  let lastUpdated: string | undefined

  const headingMatch = next.match(/^\s*<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>\s*/i)
  if (headingMatch) {
    const parsedTitle = stripHtml(headingMatch[1] ?? "")
    if (parsedTitle) {
      title = parsedTitle
      next = next.slice(headingMatch[0].length)
    }
  }

  const topUpdatedMatch = next.match(
    /^\s*<p[^>]*>\s*(?:<strong[^>]*>)?\s*last\s*updated\s*:?\s*(?:<\/strong>)?\s*([\s\S]*?)<\/p>\s*/i
  )
  if (topUpdatedMatch) {
    const parsedDate = stripHtml(topUpdatedMatch[1] ?? "")
    if (parsedDate) {
      lastUpdated = parsedDate
      next = next.slice(topUpdatedMatch[0].length)
    }
  }

  return {
    title,
    lastUpdated,
    content: cleanupContent(next)
  }
}

function extractFromPlainText(content: string): CmsHeaderExtractionResult {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  let cursor = 0

  while (cursor < lines.length && !lines[cursor].trim()) cursor += 1

  let title: string | undefined
  let lastUpdated: string | undefined

  const first = lines[cursor]?.trim() ?? ""
  if (first.startsWith("#")) {
    const parsed = first.replace(/^#+\s*/, "").trim()
    if (parsed && !/^last\s*updated/i.test(parsed)) {
      title = parsed
      lines.splice(cursor, 1)
    }
  } else if (first && !/^last\s*updated/i.test(first) && first.length <= 90 && !/[.!?]$/.test(first)) {
    title = first
    lines.splice(cursor, 1)
  }

  while (cursor < lines.length && !lines[cursor].trim()) cursor += 1
  const second = lines[cursor]?.trim() ?? ""
  const updatedMatch = second.match(/^last\s*updated\s*:?\s*(.+)$/i)
  if (updatedMatch?.[1]) {
    lastUpdated = updatedMatch[1].trim()
    lines.splice(cursor, 1)
  }

  return {
    title,
    lastUpdated,
    content: cleanupContent(lines.join("\n"))
  }
}

export function extractCmsHeader(content: string): CmsHeaderExtractionResult {
  if (!content.trim()) {
    return { content: "" }
  }
  const isHtml = /<[a-z][\s\S]*>/i.test(content)
  return isHtml ? extractFromHtml(content) : extractFromPlainText(content)
}

export function formatCmsUpdatedAt(updatedAt?: string): string {
  if (!updatedAt) return "Recently updated"
  const parsed = new Date(updatedAt)
  if (Number.isNaN(parsed.getTime())) return "Recently updated"
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}
