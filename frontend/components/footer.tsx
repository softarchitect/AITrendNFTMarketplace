import Link from "next/link"
import { Sparkles } from "lucide-react"

const footerLinks = [
  { label: "Terms", href: "/legal/terms" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Policy", href: "/legal/policy" },
  { label: "Status", href: "/status" },
  { label: "FAQ", href: "/faq" },
  { label: "Docs", href: "/partners" },
  { label: "Contact", href: "/contact" },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">Affordable NFT</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Affordable NFT. AI-powered NFT generation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
