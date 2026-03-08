"use client"

import { useEffect, useState } from "react"
import { PageTransition } from "@/components/page-transition"
import { getPublicContentPage } from "@/lib/api"
import { CmsRichContent } from "@/components/cms-rich-content"
import { extractCmsHeader, formatCmsUpdatedAt } from "@/lib/cms-header"

export default function ContractInfoPage() {
  const [title, setTitle] = useState("Contract Information")
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>("")
  const [content, setContent] = useState("")

  useEffect(() => {
    getPublicContentPage("contract")
      .then((page) => {
        const extracted = extractCmsHeader(page.content ?? "")
        setTitle(extracted.title || page.title || "Contract Information")
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
        <p className="text-sm text-muted-foreground">
          {lastUpdatedLabel ? `Last updated: ${lastUpdatedLabel}` : "Current network and deployed contract details."}
        </p>
        <div className="mt-8">
          <CmsRichContent content={content} />
        </div>
      </div>
    </PageTransition>
  )
}
