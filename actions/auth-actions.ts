'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface LoginResult {
  error: string
  success: boolean
  role: string
}

/**
 * Super Admin Login: verified against public.users database
 */
export async function loginAdmin(state: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required', success: false, role: '' }
  }

  const supabase = await createClient()

  // Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message, success: false, role: '' }
  }

  // Auditing role against public.users database table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile || profile.role !== 'super_admin') {
    // Force signout to clear cookie session if access is rejected
    await supabase.auth.signOut()
    return { error: 'Access denied. Super Admin credentials only.', success: false, role: '' }
  }

  revalidatePath('/', 'layout')
  
  return { 
    error: '',
    success: true, 
    role: 'super_admin' 
  }
}

/**
 * Client Portal Login: verified against public.users database
 */
export async function loginClient(state: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required', success: false, role: '' }
  }

  const supabase = await createClient()

  // Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message, success: false, role: '' }
  }

  // Auditing role against public.users database table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile || profile.role !== 'client') {
    // Force signout to clear cookie session if access is rejected
    await supabase.auth.signOut()
    return { error: 'Access denied. Client credentials only.', success: false, role: '' }
  }

  revalidatePath('/', 'layout')
  
  return { 
    error: '',
    success: true, 
    role: 'client' 
  }
}

export async function logout(role?: 'super_admin' | 'client') {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  if (role === 'super_admin') {
    redirect('/admin-login')
  } else {
    redirect('/portal-login')
  }
}

export interface ForgotPasswordResult {
  error: string
  success: boolean
  message: string
}

export async function forgotPassword(
  state: ForgotPasswordResult, 
  formData: FormData
): Promise<ForgotPasswordResult> {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required', success: false, message: '' }
  }

  const supabase = await createClient()
  
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectUrl = `${origin}/auth/callback?next=/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  })

  if (error) {
    return { error: error.message, success: false, message: '' }
  }

  return { error: '', success: true, message: 'Password reset link sent to your email.' }
}

export interface ResetPasswordResult {
  error: string
  success: boolean
  message: string
}

export async function resetPassword(
  state: ResetPasswordResult, 
  formData: FormData
): Promise<ResetPasswordResult> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'All fields are required', success: false, message: '' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match', success: false, message: '' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message, success: false, message: '' }
  }

  return { error: '', success: true, message: 'Password has been reset successfully.' }
}
