"use client"

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function isLikelyHtml(input: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(input)
}

function linkifyPlainText(input: string): string {
  const escaped = escapeHtml(input)
  const withEmail = escaped.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/g,
    '<a href="mailto:$1">$1</a>'
  )
  const withUrls = withEmail.replace(
    /\b(https?:\/\/[^\s<]+[^\s<\.)])/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  return withUrls
    .split(/\r?\n\r?\n/)
    .map((block) => `<p>${block.replace(/\r?\n/g, "<br/>")}</p>`)
    .join("")
}

function sanitizeCmsHtml(input: string): string {
  const removedDangerousBlocks = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")

  const withoutInlineHandlers = removedDangerousBlocks
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*"javascript:[^"]*"/gi, ' $1="#"')
    .replace(/\s(href|src)\s*=\s*'javascript:[^']*'/gi, " $1='#'")

  return withoutInlineHandlers
}

export function CmsRichContent({ content }: { content: string }) {
  const normalized = (content ?? "").trim()
  if (!normalized) {
    return <p className="text-sm text-muted-foreground">No content yet.</p>
  }
  const html = isLikelyHtml(normalized)
    ? sanitizeCmsHtml(normalized)
    : linkifyPlainText(normalized)

  return (
    <>
      <div
        className="cms-rich-content prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style jsx global>{`
        .cms-rich-content a {
          color: hsl(var(--primary)) !important;
          text-decoration: underline !important;
          text-underline-offset: 3px !important;
          text-decoration-thickness: 2px !important;
          font-weight: 600 !important;
          word-break: break-all;
        }
        .cms-rich-content a:hover {
          opacity: 0.85;
        }
      `}</style>
    </>
  )
}
