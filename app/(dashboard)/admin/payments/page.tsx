import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PaymentsManager from '@/components/dashboard/PaymentsManager'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()

  // 1. Get authenticated user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin-login')
  }

  // Auditing role against public.users database table
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/portal-login')
  }

  // 2. Query payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*, clients(*)')
    .order('created_at', { ascending: false })

  // 3. Query client accounts with their active services for dropdown linkings
  const { data: clients } = await supabase
    .from('clients')
    .select('*, client_services(*, services(*))')
    .order('name', { ascending: true })

  return (
    <DashboardLayout 
      role="super_admin" 
      email={user.email!} 
      title="Payments Ledger"
    >
      <PaymentsManager initialPayments={payments || []} clients={clients || []} />
    </DashboardLayout>
  )
}
