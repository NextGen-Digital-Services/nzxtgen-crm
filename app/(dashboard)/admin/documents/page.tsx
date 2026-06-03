import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DocumentsManager from '@/components/dashboard/DocumentsManager'

export const dynamic = 'force-dynamic'

export default async function AdminDocumentsPage() {
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

  // 2. Query documents with client details
  const { data: documents } = await supabase
    .from('documents')
    .select('*, clients(*)')
    .order('created_at', { ascending: false })

  // 3. Query clients for upload form mappings
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  return (
    <DashboardLayout 
      role="super_admin" 
      email={user.email!} 
      title="Documents & Reports"
    >
      <DocumentsManager initialDocuments={documents || []} clients={clients || []} />
    </DashboardLayout>
  )
}
