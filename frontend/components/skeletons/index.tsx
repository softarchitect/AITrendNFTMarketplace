import { cn } from "@/lib/utils"

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-12">
      <Bone className="h-10 w-64" />
      <Bone className="h-5 w-96" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Bone className="h-10 w-full rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <Bone className="h-5 w-2/3" />
      <Bone className="h-4 w-1/2" />
      <Bone className="h-8 w-full" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Bone className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Bone className="h-8 w-3/4" />
          <Bone className="h-5 w-full" />
          <Bone className="h-5 w-2/3" />
          <Bone className="h-12 w-40 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
