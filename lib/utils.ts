import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return 'N/A'
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return 'N/A'
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getRemainingDays(dueDateString: string): {
  days: number
  text: string
  isOverdue: boolean
} {
  const due = new Date(dueDateString)
  const today = new Date()
  
  // Set times to midnight to only compare calendar days
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      days: Math.abs(diffDays),
      text: `${Math.abs(diffDays)} days overdue`,
      isOverdue: true,
    }
  } else if (diffDays === 0) {
    return {
      days: 0,
      text: 'Due today',
      isOverdue: false,
    }
  } else {
    return {
      days: diffDays,
      text: `${diffDays} days left`,
      isOverdue: false,
    }
  }
}
