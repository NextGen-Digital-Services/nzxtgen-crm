'use client'

import React, { useState, useTransition } from 'react'
import { 
  FiSearch, 
  FiPlus, 
  FiTrash2, 
  FiDollarSign, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiCalendar, 
  FiUser,
  FiX
} from 'react-icons/fi'
import { recordPayment } from '@/actions/admin-actions'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentsManagerProps {
  initialPayments: any[]
  clients: any[]
}

export default function PaymentsManager({ initialPayments, clients }: PaymentsManagerProps) {
  const [payments, setPayments] = useState(initialPayments)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedFormClientId, setSelectedFormClientId] = useState('')
  const [message, setMessage] = useState({ error: '', success: '' })

  const clearMessages = () => setMessage({ error: '', success: '' })

  // Search filter
  const filteredPayments = payments.filter(p => 
    p.clients?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.clients?.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.payment_method.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Find services for currently selected client in Record modal
  const selectedClientObject = clients.find(c => c.id === selectedFormClientId)
  const clientServices = selectedClientObject?.services || []

  const handleRecordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearMessages()

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await recordPayment(formData)
      if (res.error) {
        setMessage({ error: res.error, success: '' })
      } else {
        setMessage({ error: '', success: 'Payment successfully logged. Client statement updated.' })
        setIsAddOpen(false)
        window.location.reload()
      }
    })
  }

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <FiSearch className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, business or method..."
            className="block w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 dark:border-zinc-900 dark:bg-zinc-950 dark:text-white"
          />
        </div>

        {/* Record Button */}
        <button
          onClick={() => { clearMessages(); setIsAddOpen(true); setSelectedFormClientId('') }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-400 py-2 px-4 text-sm font-bold text-black shadow-lg shadow-gold-500/5 hover:from-gold-500 hover:to-gold-300 transition-all shrink-0 cursor-pointer"
        >
          <FiPlus className="w-4 h-4 stroke-[3]" />
          <span>Record Payment</span>
        </button>

      </div>

      {/* Messages */}
      {message.success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <FiCheckCircle className="w-4 h-4" />
          <span>{message.success}</span>
        </div>
      )}
      {message.error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-semibold text-red-600 dark:text-red-400">
          <FiAlertCircle className="w-4 h-4" />
          <span>{message.error}</span>
        </div>
      )}

      {/* Main Table Ledger */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-900 dark:bg-zinc-950/40 shadow-sm">
        {filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-500">
            <FiDollarSign className="w-12 h-12 stroke-1 mb-3 text-zinc-300 dark:text-zinc-800" />
            <p className="text-sm font-semibold">No payment records logged</p>
            <p className="text-xs mt-1">Try refining your search or log a transaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/10 text-zinc-500">
                  <th className="p-4 font-semibold">Client</th>
                  <th className="p-4 font-semibold">Business</th>
                  <th className="p-4 font-semibold">Payment Date</th>
                  <th className="p-4 font-semibold">Method</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Notes</th>
                  <th className="p-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/50">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                    <td className="p-4 font-bold text-black dark:text-white">
                      {p.clients?.name}
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{p.clients?.business_name}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{formatDate(p.payment_date)}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{p.payment_method}</td>
                    <td className="p-4">
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
                    <td className="p-4 text-zinc-500 truncate max-w-xs">{p.notes || '—'}</td>
                    <td className="p-4 font-extrabold text-black dark:text-white text-right text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Dialog Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-4">
              <h3 className="text-base font-bold text-black dark:text-white">Record Client Payment</h3>
              <button 
                onClick={() => setIsAddOpen(false)} 
                className="p-1 text-zinc-400 hover:text-black dark:hover:text-white"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
              
              {/* Select Client */}
              <div>
                <label className="block text-zinc-500 mb-1">Select Client Account *</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <FiUser className="h-4 w-4" />
                  </div>
                  <select
                    name="clientId"
                    required
                    value={selectedFormClientId}
                    onChange={(e) => setSelectedFormClientId(e.target.value)}
                    className="block w-full rounded p-2 pl-9 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white"
                  >
                    <option value="">-- Choose client profile --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.business_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select Service */}
              <div>
                <label className="block text-zinc-500 mb-1">Link to Service (Optional)</label>
                <select
                  name="serviceId"
                  disabled={!selectedFormClientId || clientServices.length === 0}
                  className="block w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white disabled:opacity-50"
                >
                  <option value="">-- Select active service --</option>
                  {clientServices.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Remaining: {formatCurrency(s.remaining_balance)})
                    </option>
                  ))}
                </select>
                {!selectedFormClientId && (
                  <span className="text-[10px] text-zinc-400 mt-1 block">Please select a client first.</span>
                )}
                {selectedFormClientId && clientServices.length === 0 && (
                  <span className="text-[10px] text-amber-500 mt-1 block">No active services linked to this client.</span>
                )}
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Payment Amount ($) *</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <FiDollarSign className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      required
                      placeholder="1200.00"
                      className="block w-full rounded p-2 pl-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Payment Date *</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <FiCalendar className="h-4 w-4" />
                    </div>
                    <input
                      type="date"
                      name="paymentDate"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="block w-full rounded p-2 pl-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Method and Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Method *</label>
                  <select
                    name="paymentMethod"
                    required
                    className="block w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Stripe Credit Card">Stripe / Card</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Cash / Cheque">Cash / Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Transaction Status *</label>
                  <select
                    name="status"
                    required
                    className="block w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Internal Reference / Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Receipt transaction codes, billing logs..."
                  className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="py-2 px-4 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="py-2 px-5 rounded bg-gradient-to-r from-gold-600 to-gold-400 text-black font-extrabold disabled:opacity-50"
                >
                  {isPending ? 'Logging...' : 'Confirm Payment'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
