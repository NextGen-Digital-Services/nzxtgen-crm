import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ClientsManager from '@/components/dashboard/ClientsManager'

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
  const supabase = await createClient()

  // 1. Get authenticated session user
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

  // 2. Query clients with client_services and tasks sub-relations
  const { data: clients } = await supabase
    .from('clients')
    .select('*, client_services(*, services(*)), tasks(*)')
    .order('created_at', { ascending: false })

  // 3. Query global services lookup
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true })

  return (
    <DashboardLayout 
      role="super_admin" 
      email={user.email!} 
      title="Client Accounts"
    >
      <ClientsManager initialClients={clients || []} services={services || []} />
    </DashboardLayout>
  )
}
