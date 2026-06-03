'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FcGoogle } from 'react-icons/fc'
import { FiSmartphone, FiMail, FiLock, FiAlertCircle, FiArrowLeft, FiCheckCircle } from 'react-icons/fi'

export default function PortalLoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // State Management
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [step, setStep] = useState<1 | 2>(1)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Form Inputs
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  // Handle Email Continue (Step 1 -> Step 2)
  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter a valid email address')
      return
    }
    setError('')
    setStep(2)
  }

  // Handle Email Authentication (Step 2 Submit)
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Please enter your password')
      return
    }

    setLoading(true)
    setError('')

    if (isSignUp) {
      // Client Sign Up Flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'client',
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Double check database sync, auto sign in if verified
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profile?.role === 'super_admin') {
          router.push('/admin')
        } else {
          router.push('/client')
        }
      } else {
        setSuccessMessage('Verification email sent! Please verify your email to log in.')
        setLoading(false)
      }
    } else {
      // Client Sign In Flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profile?.role === 'super_admin') {
          router.push('/admin')
        } else {
          router.push('/client')
        }
      }
    }
  }

  // Handle Send Phone OTP (Step 1 Submit)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber) {
      setError('Please enter your phone number')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setStep(2)
    setLoading(false)
  }

  // Handle Verify Phone OTP (Step 2 Submit)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode) {
      setError('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otpCode,
      type: 'sms',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'super_admin') {
        router.push('/admin')
      } else {
        router.push('/client')
      }
    }
  }

  // Toggle state helper
  const handleBackToStepOne = () => {
    setError('')
    setStep(1)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] text-zinc-200 font-sans px-4 py-12">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        
        {/* Brand Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center">
            <span className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Nzxt<span className="text-gold-500">Gen</span>
            </span>
            <span className="text-[10px] text-zinc-500 tracking-wider font-semibold uppercase mt-0.5">
              Client Portal
            </span>
          </Link>
        </div>

        {/* Auth Body Box */}
        <div className="w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/10 bg-red-500/5 p-4 text-xs text-red-400">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 text-xs text-emerald-400">
              <FiCheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Step 1 Form */}
          {step === 1 && (
            <div className="space-y-4">
              
              {/* Google Social OAuth */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-[#0d0d0d] py-3 text-sm font-medium text-white hover:bg-zinc-900 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FcGoogle className="h-5 w-5" />
                <span>Continue with Google</span>
              </button>

              {/* Phone OTP / Switch Methods Buttons */}
              {authMethod === 'email' ? (
                <button
                  onClick={() => {
                    setError('')
                    setAuthMethod('phone')
                  }}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-[#0d0d0d] py-3 text-sm font-medium text-white hover:bg-zinc-900 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FiSmartphone className="h-4.5 w-4.5 text-zinc-400" />
                  <span>Continue with Phone (OTP)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setError('')
                    setAuthMethod('email')
                  }}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-[#0d0d0d] py-3 text-sm font-medium text-white hover:bg-zinc-900 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FiMail className="h-4.5 w-4.5 text-zinc-400" />
                  <span>Continue with Email</span>
                </button>
              )}

              {/* OR Divider Line */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              {/* EMAIL METHOD FLOW */}
              {authMethod === 'email' && (
                <form onSubmit={handleEmailContinue} className="space-y-4">
                  <div className="space-y-1.5">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="block w-full rounded-lg border border-zinc-800 bg-[#202123] py-3 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-700"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-lg bg-gold-500 py-3 text-sm font-bold text-black hover:bg-gold-400 transition-colors cursor-pointer"
                  >
                    Continue
                  </button>
                </form>
              )}

              {/* PHONE OTP METHOD FLOW */}
              {authMethod === 'phone' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+15550009999 (Phone number with area code)"
                      className="block w-full rounded-lg border border-zinc-800 bg-[#202123] py-3 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-700"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-lg bg-gold-500 py-3 text-sm font-bold text-black hover:bg-gold-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending code...' : 'Send OTP Code'}
                  </button>
                </form>
              )}

              {/* Bottom login/signup toggle (Only visible in email mode) */}
              {authMethod === 'email' && (
                <div className="text-center text-xs mt-4 text-zinc-400">
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <button
                        onClick={() => {
                          setError('')
                          setIsSignUp(false)
                        }}
                        className="text-gold-500 hover:underline font-semibold"
                      >
                        Log In
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <button
                        onClick={() => {
                          setError('')
                          setIsSignUp(true)
                        }}
                        className="text-gold-500 hover:underline font-semibold"
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Step 2 Form (Password entry or OTP validation) */}
          {step === 2 && (
            <div className="space-y-4">
              
              {/* Back Link */}
              <button
                onClick={handleBackToStepOne}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Go back</span>
              </button>

              {/* Email / Password Step 2 Form */}
              {authMethod === 'email' && (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-semibold block">Email address</span>
                    <span className="text-sm font-medium text-white block">{email}</span>
                  </div>

                  <div className="space-y-1.5 relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="block w-full rounded-lg border border-zinc-800 bg-[#202123] py-3 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-lg bg-gold-500 py-3 text-sm font-bold text-black hover:bg-gold-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
                  </button>
                </form>
              )}

              {/* Phone OTP Verification Step 2 Form */}
              {authMethod === 'phone' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-semibold block">Phone Number</span>
                    <span className="text-sm font-medium text-white block">{phoneNumber}</span>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="6-digit code"
                      className="block w-full text-center tracking-[0.5em] rounded-lg border border-zinc-800 bg-[#202123] py-3 px-4 text-lg font-bold text-white placeholder-zinc-500 outline-none focus:border-zinc-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-lg bg-gold-500 py-3 text-sm font-bold text-black hover:bg-gold-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </form>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  )
}
