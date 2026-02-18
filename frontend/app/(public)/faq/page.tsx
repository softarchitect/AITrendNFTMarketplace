"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PageTransition } from "@/components/page-transition"
import { mockFAQs } from "@/lib/mock-data"

export default function FAQPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">FAQ</h1>
        <p className="text-muted-foreground mb-8">Everything you need to know about TrendMint.</p>

        <Accordion type="single" collapsible className="space-y-2">
          {mockFAQs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-5">
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PageTransition>
  )
}
