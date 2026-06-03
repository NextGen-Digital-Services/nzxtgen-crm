import React from 'react'

export function CardSkeleton() {
  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 skeleton-shimmer">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
      <div className="mt-4">
        <div className="h-8 w-32 rounded bg-zinc-300 dark:bg-zinc-800" />
        <div className="mt-2 h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-white overflow-hidden dark:border-zinc-900 dark:bg-zinc-950/40 skeleton-shimmer">
      <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/30">
        <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 items-center justify-between py-2 border-b border-zinc-100/50 last:border-0 dark:border-zinc-900/50">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-4 rounded bg-zinc-200 dark:bg-zinc-800`}
                style={{
                  width: cIdx === 0 ? '30%' : cIdx === cols - 1 ? '15%' : '20%',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 skeleton-shimmer">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-1 h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800/60" />
        </div>
        <div className="h-6 w-24 rounded bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
      <div className="flex items-end justify-between h-48 pt-4 border-b border-zinc-100 dark:border-zinc-900">
        {[40, 70, 45, 90, 60, 80, 50, 95, 75, 85, 55, 65].map((height, idx) => (
          <div
            key={idx}
            className="w-5 rounded-t bg-zinc-200 dark:bg-zinc-800/60"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((month, idx) => (
          <div key={idx} className="h-3 w-8 rounded bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  )
}
