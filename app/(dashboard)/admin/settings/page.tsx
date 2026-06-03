import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import SettingsManager from '@/components/dashboard/SettingsManager'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
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

  // 2. Query reminder templates
  const { data: templates } = await supabase
    .from('reminder_templates')
    .select('*')
    .order('name', { ascending: true })

  // 3. Query webhook execution logs (last 50 events)
  const { data: logs } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <DashboardLayout 
      role="super_admin" 
      email={user.email!} 
      title="Automation Configurations"
    >
      <SettingsManager initialTemplates={templates || []} initialWebhookLogs={logs || []} />
    </DashboardLayout>
  )
}
