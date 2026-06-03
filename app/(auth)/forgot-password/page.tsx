'use client'

import React, { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/actions/auth-actions'
import { FiMail, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

const initialState = {
  error: '',
  success: false,
  message: '',
}

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPassword, initialState)

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
            Reset password
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Form Box */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <form action={formAction} className="space-y-6">
            
            {/* Success Banner */}
            {state?.success && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-400">
                <FiCheckCircle className="w-4 h-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            {/* Error Banner */}
            {state?.error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-400">
                <FiAlertCircle className="w-4 h-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <FiMail className="h-4.5 w-4.5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-gold-600 to-gold-400 py-2.5 px-4 text-sm font-bold text-black shadow-lg shadow-gold-500/5 hover:from-gold-500 hover:to-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all disabled:opacity-50"
              >
                {isPending ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </div>

            <div className="text-center mt-4">
              <Link
                href="/login"
                className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
