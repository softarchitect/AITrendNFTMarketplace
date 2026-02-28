"use client"

import { useEffect, useState } from "react"
import { PageTransition } from "@/components/page-transition"
import { getPublicContentPage } from "@/lib/api"

export default function TermsPage() {
  const [title, setTitle] = useState("Terms of Service")
  const [content, setContent] = useState("")

  useEffect(() => {
    getPublicContentPage("terms")
      .then((page) => {
        setTitle(page.title || "Terms of Service")
        setContent(page.content)
      })
      .catch(() => {
        setContent("")
      })
  }, [])

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 1, 2026</p>

        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          {content
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0)
            .map((line, index) => (
              <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
            ))}
        </div>
      </div>
    </PageTransition>
  )
}
