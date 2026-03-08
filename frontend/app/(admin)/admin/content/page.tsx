"use client"

import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent } from "react"
import { Copy, Loader2, Save } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { extractCmsHeader } from "@/lib/cms-header"
import {
  createUatDemoUser,
  getAdminContentPages,
  getWalletHandoverStatus,
  updateAdminContentPage
} from "@/lib/api"
import { toast } from "sonner"

export default function AdminContentPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pages, setPages] = useState<Array<{ slug: string; title: string; content: string }>>([])
  const [selectedSlug, setSelectedSlug] = useState("faq")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [walletInfo, setWalletInfo] = useState<{
    signer?: {
      mode: string
      contractAddress: string
      chainId: number
      minterAddress?: string
      adminAddress?: string
      adminConfigured: boolean
      hasDefaultAdminRole?: boolean
    }
    requirements?: string[]
  }>()
  const [uatEmail, setUatEmail] = useState("demo.buyer@affordablenft.com")
  const [uatPassword, setUatPassword] = useState("DemoBuyer#2026")
  const [uatDisplayName, setUatDisplayName] = useState("Demo Buyer")
  const [creatingUat, setCreatingUat] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const selectedPage = useMemo(
    () => pages.find((item) => item.slug === selectedSlug),
    [pages, selectedSlug]
  )

  useEffect(() => {
    Promise.all([getAdminContentPages(), getWalletHandoverStatus()])
      .then(([cmsPages, handover]) => {
        setPages(cmsPages)
        const first = cmsPages[0]
        const initialSlug = cmsPages.find((item) => item.slug === "faq")?.slug ?? first?.slug ?? "faq"
        setSelectedSlug(initialSlug)
        const initial = cmsPages.find((item) => item.slug === initialSlug)
        setTitle(initial?.title ?? "")
        setContent(initial?.content ?? "")
        setWalletInfo(handover)
      })
      .catch(() => toast.error("Failed to load CMS content"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedPage) return
    setTitle(selectedPage.title)
    setContent(selectedPage.content)
  }, [selectedPage])

  async function handleSavePage() {
    if (!selectedSlug.trim()) return
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required")
      return
    }
    setSaving(true)
    try {
      const updated = await updateAdminContentPage(selectedSlug, {
        title: title.trim(),
        content
      })
      setPages((current) =>
        current.map((page) => (page.slug === updated.slug ? updated : page))
      )
      toast.success("Content page saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save page")
    } finally {
      setSaving(false)
    }
  }

  async function handleDocumentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const lower = file.name.toLowerCase()
    const supported = [".docx", ".txt", ".md"]
    if (!supported.some((ext) => lower.endsWith(ext))) {
      toast.error("Unsupported file type. Use .docx, .txt, or .md")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.")
      return
    }
    setUploadingDoc(true)
    try {
      let extracted = ""
      if (lower.endsWith(".docx")) {
        const mammoth = await import("mammoth")
        const buffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
        extracted = result.value
      } else {
        extracted = await file.text()
      }
      const normalized = extracted.replace(/\r\n/g, "\n").trim()
      if (!normalized) {
        toast.error("Document has no readable text.")
        return
      }
      const header = extractCmsHeader(normalized)
      setContent(header.content || normalized)
      if (header.title) {
        setTitle(header.title)
      } else if (!title.trim()) {
        const fallbackTitle = file.name.replace(/\.[^.]+$/, "").trim()
        if (fallbackTitle) setTitle(fallbackTitle)
      }
      toast.success("Document imported. Review and click Save Content.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse document")
    } finally {
      setUploadingDoc(false)
    }
  }

  async function handleCreateUat() {
    setCreatingUat(true)
    try {
      const created = await createUatDemoUser({
        email: uatEmail.trim(),
        password: uatPassword,
        displayName: uatDisplayName.trim()
      })
      toast.success(`UAT user ready: ${created.email}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create UAT user")
    } finally {
      setCreatingUat(false)
    }
  }

  async function handleCopyUatCredentials() {
    const payload = [
      `Email: ${uatEmail.trim()}`,
      `Password: ${uatPassword}`,
      `Display Name: ${uatDisplayName.trim()}`
    ].join("\n")
    try {
      await navigator.clipboard.writeText(payload)
      toast.success("UAT credentials copied")
    } catch {
      toast.error("Failed to copy credentials")
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content CMS</h1>
          <p className="text-muted-foreground">Manage public page content and handover readiness</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Public Pages</CardTitle>
            <CardDescription className="text-muted-foreground">
              Edits apply to FAQ, terms, privacy, policy, contact, and contract pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="h-20 animate-pulse rounded-lg bg-muted" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-foreground">Page</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedSlug}
                    onChange={(event) => setSelectedSlug(event.target.value)}
                  >
                    {pages.map((page) => (
                      <option key={page.slug} value={page.slug}>
                        {page.slug}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Title</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Content</Label>
                  <textarea
                    className="min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Import from document (.docx, .txt, .md)</Label>
                  <Input
                    type="file"
                    accept=".docx,.txt,.md"
                    onChange={(event) => void handleDocumentUpload(event)}
                    disabled={uploadingDoc || saving}
                  />
                  {uploadingDoc ? (
                    <p className="text-xs text-muted-foreground">Extracting document text...</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Import fills the editor; click Save Content to publish.</p>
                  )}
                </div>
                <Button onClick={() => void handleSavePage()} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Content
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Admin Wallet Handover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Chain ID: {walletInfo?.signer?.chainId ?? "-"}</p>
            <p className="text-muted-foreground">Contract: {walletInfo?.signer?.contractAddress ?? "-"}</p>
            <p className="text-muted-foreground">Minter wallet: {walletInfo?.signer?.minterAddress ?? "not configured"}</p>
            <p className="text-muted-foreground">Admin wallet: {walletInfo?.signer?.adminAddress ?? "not configured"}</p>
            <p className="text-muted-foreground">
              Admin key configured: {walletInfo?.signer?.adminConfigured ? "yes" : "no"}
            </p>
            <p className="text-muted-foreground">
              Has DEFAULT_ADMIN_ROLE: {walletInfo?.signer?.hasDefaultAdminRole === true ? "yes" : "no / unknown"}
            </p>
            <div className="pt-2 text-xs text-muted-foreground">
              {(walletInfo?.requirements ?? []).map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">UAT End-User Credentials</CardTitle>
            <CardDescription className="text-muted-foreground">
              Create or rotate a demo buyer account for manual purchase walkthrough.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input value={uatEmail} onChange={(event) => setUatEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Password</Label>
              <Input type="text" value={uatPassword} onChange={(event) => setUatPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Display name</Label>
              <Input value={uatDisplayName} onChange={(event) => setUatDisplayName(event.target.value)} />
            </div>
            <Button onClick={() => void handleCreateUat()} disabled={creatingUat}>
              {creatingUat ? "Creating..." : "Create / Rotate UAT User"}
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={() => void handleCopyUatCredentials()}
            >
              <Copy className="h-4 w-4" />
              Copy UAT Credentials
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
