import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  FiFileText, 
  FiTrendingUp, 
  FiDollarSign, 
  FiArrowUpRight,
  FiAlertCircle,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiBell
} from 'react-icons/fi'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ClientPortalPage() {
  const supabase = await createClient()

  // 1. Get authenticated user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal-login')
  }

  // Fetch role from public.users database table
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const userRole = profile?.role

  if (userRole !== 'client') {
    redirect('/admin')
  }

  // 2. Query client record mapping user_id with client_services and tasks
  const { data: client, error } = await supabase
    .from('clients')
    .select('*, client_services(*, services(*)), tasks(*), invoices(*), reports(*), documents(*)')
    .eq('user_id', user.id)
    .maybeSingle()

  // Profile not provisioned yet (empty state)
  if (error || !client) {
    return (
      <DashboardLayout role={userRole} email={user.email!} title="Client Portal">
        <div className="flex min-h-[60vh] items-center justify-center text-center p-6 bg-white dark:bg-zinc-950/40 rounded-2xl border border-zinc-150 dark:border-zinc-900">
          <div className="max-w-md space-y-4">
            <FiAlertCircle className="w-12 h-12 stroke-1 text-gold-500 mx-auto animate-pulse" />
            <h2 className="text-xl font-bold text-black dark:text-white">No projects assigned yet.</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              We are finalizing configuration of your campaigns. Once your account representative assigns active services, details will propagate automatically here.
            </p>
            <div className="pt-2 text-[10px] text-zinc-400">
              Registered ID: <span className="font-mono text-zinc-700 dark:text-zinc-300">{user.email}</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (client.status === 'suspended') {
    return (
      <DashboardLayout role={userRole} email={user.email!} title="Portal Access Suspended">
        <div className="flex min-h-[60vh] items-center justify-center text-center p-6 bg-white dark:bg-zinc-950/40 rounded-2xl border border-red-500/10">
          <div className="max-w-md space-y-4">
            <FiAlertCircle className="w-12 h-12 stroke-1 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-black dark:text-white">Access Temporarily Suspended</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your portal access has been temporarily suspended by management. Please coordinate with your account representative or contact support.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Fetch payments separately
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', client.id)
    .order('payment_date', { ascending: false })
    .limit(3)

  // Fetch notifications separately
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(4)

  const clientServices = client.client_services || []
  const activeServices = clientServices.filter((cs: any) => cs.status === 'active')
  
  // Calculate aggregated billing sums
  const totalContractCost = clientServices.reduce((sum: number, s: any) => sum + Number(s.total_cost), 0)
  const totalAdvancePaid = clientServices.reduce((sum: number, s: any) => sum + Number(s.advance_paid), 0)
  const totalRemainingBalance = clientServices.reduce((sum: number, s: any) => sum + Number(s.remaining_balance), 0)

  // Calculate task statistics
  const clientTasks = client.tasks || []
  const totalTasksCount = clientTasks.length
  const pendingTasksCount = clientTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length
  const completedTasksCount = clientTasks.filter((t: any) => t.status === 'completed').length
  const taskProgressPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0

  return (
    <DashboardLayout 
      role={userRole} 
      email={user.email!} 
      title="Client Portal Dashboard"
    >
      <div className="space-y-8 font-sans">
        
        {/* Welcome Section / Profile Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 bg-black p-6 rounded-2xl border border-zinc-900 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 bg-gold-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="z-10 space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FiUser className="text-gold-500 text-glow-gold" />
              <span>Welcome, {client.name}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              <span className="font-semibold text-white uppercase tracking-wider">{client.business_name}</span>
              {client.phone_number && <span>• {client.phone_number}</span>}
              <span>• {client.email}</span>
            </div>
          </div>
          {activeServices.length > 0 && (
            <div className="z-10 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-xs shrink-0 max-w-xs space-y-1">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Active Services ({activeServices.length})</span>
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {activeServices.slice(0, 2).map((cs: any) => (
                  <span key={cs.id} className="font-bold text-white text-[10px] bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {cs.services?.name || cs.custom_name || 'Service'}
                  </span>
                ))}
                {activeServices.length > 2 && (
                  <span className="text-gold-500 text-[10px] self-center">+{activeServices.length - 2} more</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Grid Panels (Top row: Billing, Tasks Progress, Active Services) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Services & Billing Card */}
          <div className="hover-gold-trigger rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Service & Billing</span>
                <FiDollarSign className="w-5 h-5 text-gold-500" />
              </div>
              
              {clientServices.length > 0 ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 font-medium">Total Contract Value</span>
                      <p className="font-bold text-black dark:text-white mt-0.5 text-base">
                        {formatCurrency(totalContractCost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-400 font-medium">Paid To Date</span>
                      <p className="font-semibold text-emerald-500 mt-0.5 text-sm">
                        {formatCurrency(totalAdvancePaid)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-900/50 pt-3">
                    <span className="text-xs text-zinc-400 font-medium">Outstanding Balance</span>
                    <p className={`text-xl font-extrabold mt-0.5 ${
                      totalRemainingBalance > 0 ? 'text-gold-500 text-glow-gold' : 'text-emerald-500'
                    }`}>
                      {formatCurrency(totalRemainingBalance)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-zinc-400 italic text-xs text-center">
                  No projects assigned yet.
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900/50 mt-6 flex justify-between items-center text-xs">
              <span className="text-zinc-500">
                Services Registered: {clientServices.length}
              </span>
              <Link 
                href="/client/payments"
                className="text-gold-500 font-bold hover:text-gold-400 flex items-center gap-1 transition-colors"
              >
                <span>Billing Ledger</span>
                <FiArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Tasks Progress Card */}
          <div className="hover-gold-trigger rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tasks Progress</span>
                <FiCheckCircle className="w-5 h-5 text-gold-500 text-glow-gold" />
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-400 font-medium">Pending Tasks</span>
                    <p className="font-bold text-amber-500 mt-0.5 text-base">
                      {pendingTasksCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-medium">Completed Tasks</span>
                    <p className="font-bold text-emerald-500 mt-0.5 text-base">
                      {completedTasksCount}
                    </p>
                  </div>
                </div>

                {/* Progress Meter Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-semibold">
                    <span>Task Completion</span>
                    <span>{taskProgressPct}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-200/20">
                    <div 
                      className="bg-gradient-to-r from-gold-600 to-gold-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${taskProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900/50 mt-6 text-xs text-zinc-500 flex justify-between items-center">
              <span>Current Project Status</span>
              <span className="text-gold-500 font-bold">{totalTasksCount} Total Tasks</span>
            </div>
          </div>

          {/* Active Services List Card */}
          <div className="hover-gold-trigger rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Services</span>
                <FiUser className="w-5 h-5 text-gold-500" />
              </div>

              {activeServices.length > 0 ? (
                <div className="space-y-2 pt-2 max-h-[140px] overflow-y-auto pr-1">
                  {activeServices.map((cs: any) => (
                    <div key={cs.id} className="flex justify-between items-center text-[11px] p-2 rounded bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-900/50">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-black dark:text-white truncate">{cs.services?.name || cs.custom_name || 'Service'}</p>
                        <p className="text-[9px] text-zinc-500">Started {formatDate(cs.start_date)}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-gold-500 shrink-0">{formatCurrency(cs.total_cost)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-zinc-400 italic text-xs text-center">
                  No active services.
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900/50 mt-6 text-xs text-zinc-500">
              Total active: {activeServices.length}
            </div>
          </div>

        </div>

        {/* Dashboard Grid Panels (Assigned Tasks and Latest Documents) */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Assigned Tasks Checklist Panel */}
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-4 flex items-center gap-2">
              <FiCheckCircle className="text-gold-500" />
              <span>Assigned Tasks Checklist</span>
            </h3>

            {clientTasks.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 italic text-xs">
                No tasks assigned to your account yet.
              </div>
            ) : (
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-900">
                      <th className="pb-2 font-semibold">Task</th>
                      <th className="pb-2 font-semibold">Priority</th>
                      <th className="pb-2 font-semibold">Due Date</th>
                      <th className="pb-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/50">
                    {clientTasks.map((t: any) => {
                      let priorityColor = 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                      if (t.priority === 'urgent') priorityColor = 'bg-red-500/10 text-red-500 border border-red-500/20'
                      else if (t.priority === 'high') priorityColor = 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      else if (t.priority === 'medium') priorityColor = 'bg-blue-500/10 text-blue-500 border border-blue-500/20'

                      return (
                        <tr key={t.id} className="text-zinc-700 dark:text-zinc-300">
                          <td className="py-2.5 font-bold text-black dark:text-white">
                            <div>
                              <span className={t.status === 'completed' ? 'line-through opacity-50 text-zinc-400' : ''}>{t.title}</span>
                              {t.description && <p className="text-[10px] text-zinc-500 font-normal mt-0.5">{t.description}</p>}
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${priorityColor}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-2.5 text-zinc-650 dark:text-zinc-400">{formatDate(t.due_date)}</td>
                          <td className="py-2.5 text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              t.status === 'completed' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : t.status === 'in_progress'
                                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Latest Documents & Reports Card */}
          <div className="hover-gold-trigger rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Latest Documents</span>
                <FiFileText className="w-5 h-5 text-gold-500" />
              </div>

              {client.documents && client.documents.length > 0 ? (
                <div className="space-y-2.5 pt-2">
                  {client.documents.slice(0, 4).map((doc: any) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded bg-zinc-50/50 dark:bg-zinc-900/10 hover:bg-zinc-50/10 dark:hover:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-900/50 text-xs font-medium text-black dark:text-zinc-200 transition-colors"
                    >
                      <span className="truncate pr-4">{doc.name}</span>
                      <FiArrowUpRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400 italic text-xs">
                  No documents available.
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900/50 mt-6 text-right text-xs">
              <Link
                href="/client/documents"
                className="text-gold-500 font-bold hover:text-gold-400 transition-colors"
              >
                All documents
              </Link>
            </div>
          </div>

        </div>

        {/* Dashboard Grid Panels (Invoices and Payments) */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Invoices List Panel */}
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-4 flex items-center gap-2">
              <FiFileText className="text-gold-500" />
              <span>Outstanding Invoices</span>
            </h3>

            {(!client.invoices || client.invoices.length === 0) ? (
              <div className="text-center py-8 text-zinc-400 italic text-xs">
                No invoices available.
              </div>
            ) : (
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-900">
                      <th className="pb-2 font-semibold">Invoice ID</th>
                      <th className="pb-2 font-semibold">Due Date</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/50">
                    {client.invoices.slice(0, 3).map((inv: any) => (
                      <tr key={inv.id} className="text-zinc-700 dark:text-zinc-300">
                        <td className="py-2.5 font-bold text-black dark:text-white">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2.5">{formatDate(inv.due_date)}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            inv.status === 'paid' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-black dark:text-white text-right">
                          {formatCurrency(inv.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Past Payments Panel */}
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-4 flex items-center gap-2">
              <FiDollarSign className="text-gold-500" />
              <span>Past Payments</span>
            </h3>

            {(!payments || payments.length === 0) ? (
              <div className="text-center py-8 text-zinc-400 italic text-xs">
                No payments recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-[11px] p-2 border border-zinc-100 dark:border-zinc-900 rounded bg-zinc-50/50 dark:bg-zinc-900/10">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-black dark:text-white truncate">{p.payment_method}</p>
                      <p className="text-[9px] text-zinc-500">{formatDate(p.payment_date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-emerald-500">{formatCurrency(p.amount)}</p>
                      <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-bold">{p.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* In-app Notifications Panel */}
        <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-4 flex items-center gap-2">
            <FiBell className="text-gold-500" />
            <span>In-App Notifications & Alert History</span>
          </h3>

          {(!notifications || notifications.length === 0) ? (
            <div className="text-center py-8 text-zinc-400 italic text-xs">
              No notifications available.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notifications.map((n) => (
                <div key={n.id} className="p-3.5 border border-zinc-100 dark:border-zinc-900 rounded-lg flex items-start gap-3 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
                  <div className="h-2 w-2 rounded-full bg-gold-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-black dark:text-white">{n.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[9px] text-zinc-400 mt-1">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
