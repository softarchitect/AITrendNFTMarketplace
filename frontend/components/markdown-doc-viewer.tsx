"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function MarkdownDocViewer({ content }: { content: string }) {
  return (
    <div className="rounded-md border border-input bg-background p-6">
      <article
        className="prose prose-sm max-w-none prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-7 prose-li:leading-7 prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-muted prose-code:before:content-none prose-code:after:content-none prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-th:border prose-th:border-border prose-th:bg-muted/40 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1 prose-a:text-primary prose-a:underline prose-a:decoration-2 prose-a:underline-offset-2 dark:prose-invert"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node: _node, ...props }) => (
              <a {...props} target="_blank" rel="noreferrer noopener" />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  )
}
