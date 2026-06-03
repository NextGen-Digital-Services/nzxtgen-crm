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
    .single()

  const userRole = profile?.role

  if (userRole !== 'client') {
    redirect('/admin')
  }

  // 2. Query client record mapping user_id
  const { data: client, error } = await supabase
    .from('clients')
    .select('*, services(*), ad_budgets(*), invoices(*), reports(*), documents(*)')
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

  const activeService = client.services?.[0]
  const activeBudget = client.ad_budgets?.[0]
  
  // Calculate ad budget spent percentages
  let budgetSpentPct = 0
  if (activeBudget && Number(activeBudget.total_budget) > 0) {
    budgetSpentPct = Math.min(100, Math.round((Number(activeBudget.amount_spent) / Number(activeBudget.total_budget)) * 100))
  }

  return (
    <DashboardLayout 
      role={userRole} 
      email={user.email!} 
      title="Client Portal Dashboard"
    >
      <div className="space-y-8">
        
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
          {activeService && (
            <div className="z-10 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-xs shrink-0 max-w-xs">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Active Service</span>
              <span className="font-bold text-white text-sm mt-0.5 block">{activeService.name}</span>
              <span className="text-[10px] text-gold-500 block mt-1">Started {formatDate(activeService.start_date)}</span>
            </div>
          )}
        </div>

        {/* Dashboard Grid Panels */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Services & Billing Card */}
          <div className="hover-gold-trigger rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Service & Billing</span>
                <FiDollarSign className="w-5 h-5 text-gold-500" />
              </div>
              
              {activeService ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 font-medium">Contract Cost</span>
                      <p className="font-bold text-black dark:text-white mt-0.5 text-base">
                        {formatCurrency(activeService.total_cost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-400 font-medium">Paid To Date</span>
                      <p className="font-semibold text-emerald-500 mt-0.5 text-sm">
                        {formatCurrency(activeService.advance_paid)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-900/50 pt-3">
                    <span className="text-xs text-zinc-400 font-medium">Outstanding Balance</span>
                    <p className={`text-xl font-extrabold mt-0.5 ${
                      Number(activeService.remaining_balance) > 0 ? 'text-gold-500 text-glow-gold' : 'text-emerald-500'
                    }`}>
                      {formatCurrency(activeService.remaining_balance)}
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
                Status: {activeService?.status || 'N/A'}
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

          {/* Ad Spend Card */}
          <div className="hover-gold-trigger rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Marketing Budget</span>
                <FiTrendingUp className="w-5 h-5 text-gold-500 text-glow-gold" />
              </div>

              {activeBudget ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 font-medium">Total Ad Budget</span>
                      <p className="font-bold text-black dark:text-white mt-0.5 text-base">
                        {formatCurrency(activeBudget.total_budget)}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-400 font-medium">Remaining Budget</span>
                      <p className="font-semibold text-gold-500 mt-0.5 text-sm">
                        {formatCurrency(activeBudget.remaining_budget)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Meter Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-zinc-500 font-semibold">
                      <span>Spent: {formatCurrency(activeBudget.amount_spent)}</span>
                      <span>{budgetSpentPct}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-200/20">
                      <div 
                        className="bg-gradient-to-r from-gold-600 to-gold-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${budgetSpentPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400 italic text-xs">
                  No active ad budget configured.
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900/50 mt-6 text-xs text-zinc-500">
              Updated: {activeBudget ? formatDate(activeBudget.updated_at) : 'N/A'}
            </div>
          </div>

          {/* Latest Documents & Reports */}
          <div className="hover-gold-trigger rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Latest Documents</span>
                <FiFileText className="w-5 h-5 text-gold-500" />
              </div>

              {client.documents && client.documents.length > 0 ? (
                <div className="space-y-2.5 pt-2">
                  {client.documents.slice(0, 3).map((doc: any) => (
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
                <div className="text-center py-8 text-zinc-400 italic text-xs">
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
                    <div>
                      <p className="font-semibold text-black dark:text-white">{p.payment_method}</p>
                      <p className="text-[9px] text-zinc-500">{formatDate(p.payment_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">{formatCurrency(p.amount)}</p>
                      <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-bold">{p.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-app Notifications Panel */}
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 md:col-span-3">
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

      </div>
    </DashboardLayout>
  )
}
