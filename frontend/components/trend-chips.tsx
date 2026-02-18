"use client"

import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const trendingTopics = [
  "AI Sentience Debate",
  "Quantum Computing",
  "Solar Maximum",
  "Deep Sea Discovery",
  "Retro Gaming",
  "Street Art Revival",
  "Neural Networks",
  "Mars Colony",
  "Cyberpunk 2077",
  "Digital Fashion",
]

export function TrendChips({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
      <span className="text-sm font-medium text-muted-foreground mr-1">Trending:</span>
      {trendingTopics.map((topic, i) => (
        <motion.span
          key={topic}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-default"
        >
          {topic}
        </motion.span>
      ))}
    </div>
  )
}

export function FloatingTrendChips({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      {trendingTopics.slice(0, 6).map((topic, i) => (
        <motion.div
          key={topic}
          className="absolute rounded-full border border-border/50 bg-card/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
          style={{
            left: `${10 + (i % 3) * 30}%`,
            top: `${15 + Math.floor(i / 3) * 40}%`,
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        >
          {topic}
        </motion.div>
      ))}
    </div>
  )
}
