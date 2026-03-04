"use client"

import { useEffect, useState } from "react"
import { PageTransition } from "@/components/page-transition"
import { getPublicContentPage } from "@/lib/api"
import { CmsRichContent } from "@/components/cms-rich-content"

export default function PolicyPage() {
  const [title, setTitle] = useState("Platform Policy")
  const [content, setContent] = useState("")

  useEffect(() => {
    getPublicContentPage("policy")
      .then((page) => {
        setTitle(page.title || "Platform Policy")
        setContent(page.content)
      })
      .catch(() => {
        setContent("")
      })
  }, [])

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 1, 2026</p>

        <div className="mt-8">
          <CmsRichContent content={content} />
        </div>
      </div>
    </PageTransition>
  )
}
