"use client"

import { useState } from "react"
import { X, Megaphone } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function AnnouncementBar({
  message = "New drop incoming: Neural Visions Collection is minting now!",
  variant = "info",
}: {
  message?: string
  variant?: "info" | "warning"
}) {
  const [visible, setVisible] = useState(true)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`relative z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
            variant === "warning"
              ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
              : "bg-primary text-primary-foreground"
          }`}
        >
          <Megaphone className="h-4 w-4 shrink-0" />
          <span className="truncate">{message}</span>
          <button
            onClick={() => setVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss announcement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
