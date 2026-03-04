"use client"

import { useEffect, useState } from "react"
import { MarkdownDocViewer } from "@/components/markdown-doc-viewer"
import { PageTransition } from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { getAdminDocContent, getAdminDocs } from "@/lib/api"
import { toast } from "sonner"

export default function AdminDocsPage() {
  const [docs, setDocs] = useState<Array<{ id: string; title: string; updatedAt: string }>>([])
  const [selectedDocId, setSelectedDocId] = useState("")
  const [docContent, setDocContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingDoc, setLoadingDoc] = useState(false)

  useEffect(() => {
    getAdminDocs()
      .then((docList) => {
        setDocs(docList)
        if (docList.length > 0) {
          setSelectedDocId(docList[0].id)
        }
      })
      .catch(() => toast.error("Failed to load documentation list"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedDocId) {
      setDocContent("")
      return
    }
    setLoadingDoc(true)
    getAdminDocContent(selectedDocId)
      .then((doc) => setDocContent(doc.content))
      .catch((error) => {
        setDocContent("")
        toast.error(error instanceof Error ? error.message : "Failed to load documentation")
      })
      .finally(() => setLoadingDoc(false))
  }, [selectedDocId])

  const selectedDoc = docs.find((item) => item.id === selectedDocId)

  return (
    <PageTransition>
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Documentation</CardTitle>
            <CardDescription className="text-muted-foreground">
              Read-only API and handover markdown files served from this system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-foreground">Document</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedDocId}
                onChange={(event) => setSelectedDocId(event.target.value)}
                disabled={loading}
              >
                {loading ? (
                  <option value="">Loading...</option>
                ) : docs.length === 0 ? (
                  <option value="">No documents found</option>
                ) : (
                  docs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))
                )}
              </select>
              {selectedDoc ? (
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(selectedDoc.updatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Markdown Content</Label>
              {loadingDoc ? (
                <div className="rounded-md border border-input bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  Loading document...
                </div>
              ) : (
                <MarkdownDocViewer content={docContent || "_No content_"} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
