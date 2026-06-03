'use client'

import React, { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/actions/auth-actions'
import { FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

const initialState = {
  error: '',
  success: false,
  message: '',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(resetPassword, initialState)

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/login')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Branding Title */}
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center">
            <span className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Nzxt<span className="text-gold-500">Gen</span>
            </span>
            <span className="text-xs text-zinc-500 tracking-widest font-semibold uppercase mt-0.5">
              Client Portal & CRM
            </span>
          </Link>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-zinc-100">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Create a secure password for your account
          </p>
        </div>

        {/* Form Box */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <form action={formAction} className="space-y-6">
            
            {/* Success Banner */}
            {state?.success && (
              <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-400">
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="w-4 h-4 shrink-0" />
                  <span>{state.message}</span>
                </div>
                <span className="text-[10px] text-emerald-500 pl-7">Redirecting you to login page...</span>
              </div>
            )}

            {/* Error Banner */}
            {state?.error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-400">
                <FiAlertCircle className="w-4 h-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* New Password Input */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <FiLock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <FiLock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending || state?.success}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-gold-600 to-gold-400 py-2.5 px-4 text-sm font-bold text-black shadow-lg shadow-gold-500/5 hover:from-gold-500 hover:to-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all disabled:opacity-50"
              >
                {isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
