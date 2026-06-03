'use client'

import React, { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginAdmin } from '@/actions/auth-actions'
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi'

const initialState = {
  error: '',
  success: false,
  role: '',
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(loginAdmin, initialState)

  useEffect(() => {
    if (state?.success && state.role === 'super_admin') {
      router.push('/admin')
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Branding Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center">
            <span className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Nzxt<span className="text-gold-500">Gen</span>
            </span>
            <span className="text-xs text-zinc-500 tracking-widest font-semibold uppercase mt-0.5">
              CRM Admin Panel
            </span>
          </Link>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-zinc-150">
            Admin Console Sign In
          </h2>
          <p className="mt-2 text-xs text-zinc-400">
            Authorized Personnel Only
          </p>
        </div>

        {/* Form Box */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <form action={formAction} className="space-y-6">
            
            {/* Error Message */}
            {state?.error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-400">
                <FiAlertCircle className="w-4 h-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <FiMail className="h-4.5 w-4.5" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
                    placeholder="admin@nzxtgen.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <FiLock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-gold-600 to-gold-400 py-2.5 px-4 text-sm font-bold text-black shadow-lg shadow-gold-500/5 hover:from-gold-500 hover:to-gold-300 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Logging in...' : 'Sign In as Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
