import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FiDollarSign, FiFileText, FiDownload, FiCheckCircle } from 'react-icons/fi'

export const dynamic = 'force-dynamic'

export default async function ClientPaymentsPage() {
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

  // 2. Fetch client profile
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    redirect('/client')
  }

  // 3. Query payments and invoices for this client
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', client.id)
    .order('payment_date', { ascending: false })

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', client.id)
    .order('due_date', { ascending: false })

  return (
    <DashboardLayout 
      role={userRole} 
      email={user.email!} 
      title="Payments & Invoices"
    >
      <div className="space-y-8">
        
        {/* Invoices List Panel */}
        <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-6 flex items-center gap-2">
            <FiFileText className="text-gold-500" />
            <span>Outstanding & Billed Invoices</span>
          </h3>

          {(!invoices || invoices.length === 0) ? (
            <div className="text-center py-8 text-zinc-400 italic text-xs">
              No invoice records registered.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-900 pb-3">
                    <th className="pb-3 font-semibold">Invoice Number</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">File</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="text-zinc-700 dark:text-zinc-300">
                      <td className="py-3.5 font-bold text-black dark:text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5">{formatDate(inv.due_date)}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          inv.status === 'paid' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : inv.status === 'unpaid'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {inv.file_url ? (
                          <a 
                            href={inv.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-gold-500 hover:text-gold-400 font-bold transition-colors"
                          >
                            <FiDownload />
                            <span>Download invoice</span>
                          </a>
                        ) : (
                          <span className="text-zinc-500 italic">No attachment</span>
                        )}
                      </td>
                      <td className="py-3.5 font-extrabold text-black dark:text-white text-right text-sm">
                        {formatCurrency(inv.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments Ledger List Panel */}
        <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-6 flex items-center gap-2">
            <FiDollarSign className="text-gold-500" />
            <span>Transaction Receipt History</span>
          </h3>

          {(!payments || payments.length === 0) ? (
            <div className="text-center py-8 text-zinc-400 italic text-xs">
              No transaction receipts recorded.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-900 pb-3">
                    <th className="pb-3 font-semibold">Payment Date</th>
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Notes / Receipt Code</th>
                    <th className="pb-3 font-semibold text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/50">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="text-zinc-700 dark:text-zinc-300">
                      <td className="py-3.5 font-semibold text-black dark:text-white">
                        {formatDate(pay.payment_date)}
                      </td>
                      <td className="py-3.5">{pay.payment_method}</td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold uppercase text-[10px]">
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>{pay.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 text-zinc-400 italic font-mono">{pay.notes || '—'}</td>
                      <td className="py-3.5 font-extrabold text-black dark:text-white text-right text-sm">
                        {formatCurrency(pay.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
