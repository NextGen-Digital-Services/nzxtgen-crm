import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
import { 
  FiUsers, 
  FiTrendingUp, 
  FiClock, 
  FiDollarSign, 
  FiBriefcase, 
  FiActivity 
} from 'react-icons/fi'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
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

  // 2. Query dashboard metrics
  const { data: clients, error: clientsErr } = await supabase.from('clients').select('*')
  const { data: services, error: servicesErr } = await supabase.from('services').select('*')
  const { data: payments, error: paymentsErr } = await supabase.from('payments').select('*, clients(name, business_name)').order('created_at', { ascending: false }).limit(5)
  const { data: budgets, error: budgetsErr } = await supabase.from('ad_budgets').select('*')

  // Check if tables are not set up yet
  const schemaNotReady = clientsErr || servicesErr || paymentsErr || budgetsErr

  if (schemaNotReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12 text-center text-zinc-300">
        <div className="max-w-md space-y-4 rounded-2xl border border-zinc-900 bg-zinc-950 p-8">
          <h2 className="text-xl font-bold text-gold-500">Database Schema Required</h2>
          <p className="text-sm text-zinc-400">
            It looks like your Supabase tables are not fully configured yet. Please copy the contents of the <code className="text-white">schema.sql</code> file at the root of your project and run it in the <strong>SQL Editor</strong> of your Supabase Dashboard.
          </p>
          <div className="pt-4">
            <Link 
              href="/admin-login" 
              className="inline-block rounded bg-gold-500 py-2 px-4 text-sm font-bold text-black hover:bg-gold-400"
            >
              Reload Page
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalClients = clients?.length || 0
  const activeClients = clients?.filter(c => c.status === 'active').length || 0
  
  // Total revenue is the sum of all completed payments
  const totalRevenue = payments?.reduce((acc, p) => p.status === 'completed' ? acc + Number(p.amount) : acc, 0) || 0
  
  // Pending revenue is the sum of outstanding balances in services
  const pendingRevenue = services?.reduce((acc, s) => s.status === 'active' ? acc + Number(s.remaining_balance) : acc, 0) || 0
  
  // Total ad budget
  const totalAdBudget = budgets?.reduce((acc, b) => acc + Number(b.total_budget), 0) || 0

  // Recent activity log combining client signups and payment operations
  const activities = [
    ...(clients || []).map(c => ({
      id: c.id,
      type: 'client',
      title: 'New Client Registered',
      desc: `${c.name} (${c.business_name}) was added to CRM.`,
      date: c.created_at,
    })),
    ...(payments || []).map(p => ({
      id: p.id,
      type: 'payment',
      title: 'Payment Logged',
      desc: `A payment of ${formatCurrency(p.amount)} was recorded for ${p.clients?.name}.`,
      date: p.created_at,
    }))
  ]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 5)

  // Widgets layout metadata
  const statsWidgets = [
    {
      title: 'Total Clients',
      value: totalClients,
      desc: `${activeClients} active accounts`,
      icon: FiUsers,
      color: 'text-zinc-500 dark:text-zinc-400',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      desc: 'Collected payments',
      icon: FiTrendingUp,
      color: 'text-emerald-500',
    },
    {
      title: 'Pending Balance',
      value: formatCurrency(pendingRevenue),
      desc: 'Outstanding dues',
      icon: FiClock,
      color: 'text-amber-500',
    },
    {
      title: 'Ad Budget Managed',
      value: formatCurrency(totalAdBudget),
      desc: 'Active marketing budget',
      icon: FiBriefcase,
      color: 'text-gold-500 text-glow-gold',
    },
  ]

  return (
    <DashboardLayout 
      role="super_admin" 
      email={user.email!} 
      title="Admin Dashboard"
    >
      <div className="space-y-8">
        
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            Hello, Admin
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Here is your agency performance digest.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsWidgets.map((widget) => {
            const Icon = widget.icon
            return (
              <div 
                key={widget.title}
                className="hover-gold-trigger rounded-xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {widget.title}
                  </span>
                  <div className={`rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900 ${widget.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold tracking-tight text-black dark:text-white">
                    {widget.value}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {widget.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Dashboard Panels Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Recent Payments Panel */}
          <div className="rounded-xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white">
                Recent Payments
              </h3>
              <Link 
                href="/admin/payments"
                className="text-xs font-semibold text-gold-500 hover:text-gold-400 transition-colors"
              >
                View all payments
              </Link>
            </div>
            
            {(!payments || payments.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                <FiDollarSign className="w-10 h-10 stroke-1 text-zinc-300 dark:text-zinc-800 mb-3" />
                <p className="text-sm font-medium">No payments logged yet.</p>
                <p className="text-xs mt-1">Record client invoicing on the payments page.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-900">
                      <th className="pb-3 font-semibold">Client</th>
                      <th className="pb-3 font-semibold">Business</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/50">
                    {payments.map((p) => (
                      <tr key={p.id} className="text-zinc-700 dark:text-zinc-300">
                        <td className="py-3.5 font-semibold text-black dark:text-white">
                          {p.clients?.name}
                        </td>
                        <td className="py-3.5">{p.clients?.business_name}</td>
                        <td className="py-3.5 font-bold text-black dark:text-white">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3.5">{formatDate(p.payment_date)}</td>
                        <td className="py-3.5 text-right">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            p.status === 'completed' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : p.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activity Panel */}
          <div className="rounded-xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-6 flex items-center gap-2">
              <FiActivity className="w-4 h-4 text-gold-500 text-glow-gold animate-pulse" />
              <span>System Activity</span>
            </h3>

            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                <p className="text-xs">No records available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((act, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-2 w-2 rounded-full mt-1 ${
                        act.type === 'client' ? 'bg-gold-500' : 'bg-emerald-500'
                      }`} />
                      {i < activities.length - 1 && (
                        <div className="w-0.5 flex-1 bg-zinc-100 dark:bg-zinc-900 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                      <p className="font-semibold text-black dark:text-zinc-100 truncate">
                        {act.title}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                        {act.desc}
                      </p>
                      <p className="text-zinc-400 text-[9px] mt-1">
                        {formatDate(act.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  )
}
