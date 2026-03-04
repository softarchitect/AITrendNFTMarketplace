"use client"

import { useEffect, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PageTransition } from "@/components/page-transition"
import { getPublicContentPage } from "@/lib/api"
import { CmsRichContent } from "@/components/cms-rich-content"

function parseFaq(content: string): Array<{ q: string; a: string }> {
  const lines = content.split(/\r?\n/).map((line) => line.trim())
  const items: Array<{ q: string; a: string }> = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.toLowerCase().startsWith("q:")) continue
    const question = line.slice(2).trim()
    const answerLine = lines[index + 1] ?? ""
    const answer = answerLine.toLowerCase().startsWith("a:") ? answerLine.slice(2).trim() : ""
    if (question && answer) {
      items.push({ q: question, a: answer })
    }
  }
  return items
}

export default function FAQPage() {
  const [title, setTitle] = useState("FAQ")
  const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>([])
  const [rawContent, setRawContent] = useState("")

  useEffect(() => {
    getPublicContentPage("faq")
      .then((page) => {
        setTitle(page.title || "FAQ")
        setRawContent(page.content ?? "")
        const parsed = parseFaq(page.content)
        setFaqs(parsed)
      })
      .catch(() => {
        setFaqs([])
        setRawContent("")
      })
  }, [])

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8">Everything you need to know about Affordable NFT.</p>

        {faqs.length > 0 ? (
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-5">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <CmsRichContent content={rawContent} />
        )}
      </div>
    </PageTransition>
  )
}
