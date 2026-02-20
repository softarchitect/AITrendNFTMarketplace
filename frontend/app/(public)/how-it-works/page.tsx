"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Radio, Cpu, Boxes, ShoppingCart, TrendingUp, Sparkles, Shield, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PageTransition } from "@/components/page-transition"
import { mockFAQs } from "@/lib/mock-data"

const steps = [
  { icon: Radio, title: "Trend Monitoring", desc: "Our systems continuously monitor Twitter/X, Reddit, Instagram, and news aggregators for emerging trends, viral moments, and cultural shifts." },
  { icon: Cpu, title: "AI Art Generation", desc: "When a significant trend is detected, our AI pipeline generates unique artwork using custom-tuned models with carefully crafted prompts based on trend data." },
  { icon: Boxes, title: "Minting & IPFS", desc: "Generated artwork is minted as ERC-721 NFTs on Ethereum. Metadata and images are permanently stored on IPFS for decentralized access." },
  { icon: ShoppingCart, title: "Listing & Purchase", desc: "NFTs are automatically listed on our marketplace with limited editions. Buy with fiat through our payment gateway or directly with crypto." },
]

const features = [
  { icon: TrendingUp, title: "Real-Time Trends", desc: "Continuous monitoring of social media and news feeds ensures we capture the most relevant cultural moments." },
  { icon: Sparkles, title: "AI-Powered Art", desc: "State-of-the-art generative AI creates unique, high-quality artwork that captures the essence of each trend." },
  { icon: Shield, title: "Secure Transactions", desc: "Payment gateway with KYC/2FA verification and on-chain transfers ensure safe and compliant transactions." },
  { icon: Globe, title: "Decentralized Storage", desc: "All artwork and metadata are stored on IPFS, ensuring permanent, censorship-resistant access to your collectibles." },
]

export default function HowItWorksPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">How Affordable NFT Works</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            From trending topic to collectible NFT in minutes. Our automated pipeline handles everything.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mb-20">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block" />
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex gap-6 md:gap-8"
              >
                <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 pb-6">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Step {i + 1}</span>
                  <h3 className="text-xl font-bold text-foreground mt-1">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Why Affordable NFT</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <f.icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ snippet */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {mockFAQs.slice(0, 4).map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-4">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-6">
            <Link href="/faq"><Button variant="outline" className="gap-1 bg-transparent">View All FAQs <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
