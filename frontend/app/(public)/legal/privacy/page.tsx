"use client"

import { useEffect, useState } from "react"
import { PageTransition } from "@/components/page-transition"
import { getPublicContentPage } from "@/lib/api"
import { CmsRichContent } from "@/components/cms-rich-content"
import { extractCmsHeader, formatCmsUpdatedAt } from "@/lib/cms-header"

export default function PrivacyPage() {
  const [title, setTitle] = useState("Privacy Policy")
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("February 1, 2026")
  const [content, setContent] = useState("")

  useEffect(() => {
    getPublicContentPage("privacy")
      .then((page) => {
        const extracted = extractCmsHeader(page.content ?? "")
        setTitle(extracted.title || page.title || "Privacy Policy")
        setLastUpdatedLabel(extracted.lastUpdated || formatCmsUpdatedAt(page.updatedAt))
        setContent(extracted.content)
      })
      .catch(() => {
        setContent("")
      })
  }, [])

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: {lastUpdatedLabel}</p>

        <div className="mt-8">
          <CmsRichContent content={content} />
        </div>
      </div>
    </PageTransition>
  )
}
