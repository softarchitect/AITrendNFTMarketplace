"use client"

import { useEffect, useState } from "react"
import { PageTransition } from "@/components/page-transition"
import { getPublicContentPage } from "@/lib/api"
import { CmsRichContent } from "@/components/cms-rich-content"
import { extractCmsHeader, formatCmsUpdatedAt } from "@/lib/cms-header"

export default function TermsPage() {
  const [title, setTitle] = useState("Terms of Service")
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("February 1, 2026")
  const [content, setContent] = useState("")

  useEffect(() => {
    getPublicContentPage("terms")
      .then((page) => {
        const extracted = extractCmsHeader(page.content ?? "")
        setTitle(extracted.title || page.title || "Terms of Service")
        setLastUpdatedLabel(extracted.lastUpdated || formatCmsUpdatedAt(page.updatedAt))
        setContent(extracted.content)
      })
      .catch(() => {
        setContent("")
      })
  }, [])

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: {lastUpdatedLabel}</p>

        <div className="mt-8">
          <CmsRichContent content={content} />
        </div>
      </div>
    </PageTransition>
  )
}
