import React from "react"
import { PublicNav } from "@/components/public-nav"
import { Footer } from "@/components/footer"
import { AnnouncementBar } from "@/components/announcement-bar"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <PublicNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
