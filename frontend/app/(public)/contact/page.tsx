"use client"

import { useEffect, useState } from "react"
import { PageTransition } from "@/components/page-transition"
import { getPublicContentPage } from "@/lib/api"

export default function ContactPage() {
  const [title, setTitle] = useState("Contact")
  const [content, setContent] = useState("")

  useEffect(() => {
    getPublicContentPage("contact")
      .then((page) => {
        setTitle(page.title || "Contact")
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
        <p className="text-sm text-muted-foreground">Need help? Reach us through the channels below.</p>
        <div className="mt-8 space-y-4 text-sm text-muted-foreground leading-relaxed">
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
