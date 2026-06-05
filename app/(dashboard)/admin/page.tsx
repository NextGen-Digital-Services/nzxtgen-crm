import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  FiUsers, 
  FiTrendingUp, 
  FiClock, 
  FiDollarSign, 
  FiBriefcase, 
  FiActivity,
  FiCheckCircle,
  FiList
} from 'react-icons/fi'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
  const { data: clients, error: clientsErr } = await supabase.from('clients').select('*').order('created_at', { ascending: true })
  const { data: clientServices, error: servicesErr } = await supabase.from('client_services').select('*, services(name)')
  const { data: payments, error: paymentsErr } = await supabase.from('payments').select('*, clients(name, business_name)').order('payment_date', { ascending: true })
  const { data: tasks, error: tasksErr } = await supabase.from('tasks').select('*')
  const { data: globalServices, error: globalServErr } = await supabase.from('services').select('*')

  // Check if tables are not set up yet
  const schemaNotReady = clientsErr || servicesErr || paymentsErr || tasksErr || globalServErr

  if (schemaNotReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12 text-center text-zinc-300">
        <div className="max-w-md space-y-4 rounded-2xl border border-zinc-900 bg-zinc-950 p-8">
          <h2 className="text-xl font-bold text-gold-500">Database Schema Update Required</h2>
          <p className="text-sm text-zinc-400">
            Please run the SQL migration script located in <code className="text-white">migration_v2.sql</code> in the Supabase SQL Editor to configure the new multi-service CRM schema.
          </p>
          <div className="pt-4">
            <Link 
              href="/admin" 
              className="inline-block rounded bg-gold-500 py-2 px-4 text-sm font-bold text-black hover:bg-gold-400"
            >
              Reload Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalClients = clients?.length || 0
  const activeClients = clients?.filter(c => c.status === 'active').length || 0
  const totalRevenue = payments?.reduce((acc, p) => p.status === 'completed' ? acc + Number(p.amount) : acc, 0) || 0
  const activeProjectsCount = clientServices?.filter(s => s.status === 'active').length || 0
  const pendingTasksCount = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0
  const completedTasksCount = tasks?.filter(t => t.status === 'completed').length || 0

  // Calculate Service Breakdown
  const serviceCounts: Record<string, number> = {}
  globalServices?.forEach(s => {
    serviceCounts[s.name] = 0
  })
  clientServices?.forEach(cs => {
    const name = cs.services?.name || cs.custom_name || 'Custom Service'
    serviceCounts[name] = (serviceCounts[name] || 0) + 1
  })

  const serviceDistribution = Object.entries(serviceCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: clientServices && clientServices.length > 0 ? Math.round((count / clientServices.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)

  const activeServicesList = serviceDistribution.filter(item => item.count > 0)

  // Recent activity log combining client signups and payment operations (latest 5)
  const recentPaymentsLimit = [...(payments || [])].reverse().slice(0, 5)
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
      desc: `A payment of ${formatCurrency(p.amount)} was recorded for ${p.clients?.name || 'Client'}.`,
      date: p.created_at,
    }))
  ]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 5)

  // 1. CHART DATA: Revenue Trend (grouped by month, last 6 months)
  const monthlyRevenueMap: Record<string, number> = {}
  payments?.forEach(p => {
    if (p.status === 'completed') {
      const date = new Date(p.payment_date)
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' })
      monthlyRevenueMap[label] = (monthlyRevenueMap[label] || 0) + Number(p.amount)
    }
  })
  const revenueTrendData = Object.entries(monthlyRevenueMap)
    .map(([month, val]) => ({ label: month, val }))
    .slice(-6)

  const maxRevenueTrend = revenueTrendData.length > 0 ? Math.max(...revenueTrendData.map(d => d.val), 1) : 1
  const revPoints = revenueTrendData.map((d, i) => {
    const x = 50 + (i / Math.max(revenueTrendData.length - 1, 1)) * 410
    const y = 170 - (d.val / maxRevenueTrend) * 130
    return { x, y, label: d.label, val: d.val }
  })
  const revLinePath = revPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const revAreaPath = revPoints.length > 0 
    ? `${revLinePath} L ${revPoints[revPoints.length - 1].x} 170 L ${revPoints[0].x} 170 Z`
    : ''

  // 2. CHART DATA: Client Growth Cumulative (last 6 months)
  const clientGrowthMap: Record<string, number> = {}
  clients?.forEach(c => {
    const date = new Date(c.created_at)
    const label = date.toLocaleString('default', { month: 'short', year: '2-digit' })
    clientGrowthMap[label] = (clientGrowthMap[label] || 0) + 1
  })
  
  let cumulativeCount = 0
  const clientGrowthData = Object.entries(clientGrowthMap)
    .map(([month, count]) => {
      cumulativeCount += count
      return { label: month, val: cumulativeCount }
    })
    .slice(-6)

  const maxClientGrowth = clientGrowthData.length > 0 ? Math.max(...clientGrowthData.map(d => d.val), 1) : 1
  const growthPoints = clientGrowthData.map((d, i) => {
    const x = 50 + (i / Math.max(clientGrowthData.length - 1, 1)) * 410
    const y = 170 - (d.val / maxClientGrowth) * 130
    return { x, y, label: d.label, val: d.val }
  })
  const growthLinePath = growthPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const growthAreaPath = growthPoints.length > 0 
    ? `${growthLinePath} L ${growthPoints[growthPoints.length - 1].x} 170 L ${growthPoints[0].x} 170 Z`
    : ''

  return (
    <DashboardLayout 
      role="super_admin" 
      email={user.email!} 
      title="Admin Dashboard"
    >
      <div className="space-y-8 font-sans">
        
        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
              Hello, Admin
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Here is your multi-service agency performance digest.
            </p>
          </div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-450 uppercase tracking-widest font-bold">
            Currency: INR (₹)
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          
          <div className="hover-gold-trigger rounded-xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Total Clients</span>
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900 text-zinc-500">
                <FiUsers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl font-extrabold tracking-tight text-black dark:text-white">{totalClients}</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{activeClients} active accounts</p>
            </div>
          </div>

          <div className="hover-gold-trigger rounded-xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Total Revenue</span>
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900 text-emerald-500">
                <FiTrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl font-extrabold tracking-tight text-black dark:text-white">{formatCurrency(totalRevenue)}</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Completed payments</p>
            </div>
          </div>

          <div className="hover-gold-trigger rounded-xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Active Projects</span>
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900 text-blue-500">
                <FiBriefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl font-extrabold tracking-tight text-black dark:text-white">{activeProjectsCount}</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Active services</p>
            </div>
          </div>

          <div className="hover-gold-trigger rounded-xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Pending Tasks</span>
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900 text-amber-500">
                <FiClock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl font-extrabold tracking-tight text-black dark:text-white">{pendingTasksCount}</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">In progress / pending</p>
            </div>
          </div>

          <div className="hover-gold-trigger rounded-xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Completed Tasks</span>
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900 text-emerald-500">
                <FiCheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl font-extrabold tracking-tight text-black dark:text-white">{completedTasksCount}</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Task checklist milestones</p>
            </div>
          </div>

        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Revenue Trend SVG Chart */}
          <div className="rounded-xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gold-500/5 blur-2xl rounded-full" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-4">
              Revenue Trend (Last 6 Months)
            </h3>
            
            {revenueTrendData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">
                No revenue trend data available.
              </div>
            ) : (
              <div className="w-full flex flex-col justify-end">
                <svg viewBox="0 0 500 200" className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="50" y1="40" x2="470" y2="40" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="50" y1="105" x2="470" y2="105" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="50" y1="170" x2="470" y2="170" stroke="#52525b" strokeWidth="1" />

                  {/* Area Under Line */}
                  <path d={revAreaPath} fill="url(#revGrad)" />

                  {/* Connecting Line */}
                  <path d={revLinePath} fill="none" stroke="#D4AF37" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Data Circles & Value Tooltips */}
                  {revPoints.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#black" stroke="#D4AF37" strokeWidth="2.5" className="hover:r-7 transition-all cursor-pointer" />
                      <text x={p.x} y={p.y - 12} fill="#D4AF37" fontSize="9" fontWeight="bold" textAnchor="middle">
                        ₹{p.val >= 1000 ? `${(p.val / 1000).toFixed(0)}k` : p.val}
                      </text>
                      <text x={p.x} y="190" fill="#71717a" fontSize="9" textAnchor="middle" fontWeight="bold">
                        {p.label}
                      </text>
                    </g>
                  ))}

                  {/* Y-axis values */}
                  <text x="40" y="45" fill="#71717a" fontSize="9" textAnchor="end" fontWeight="bold">₹{(maxRevenueTrend/1000).toFixed(0)}k</text>
                  <text x="40" y="110" fill="#71717a" fontSize="9" textAnchor="end" fontWeight="bold">₹{((maxRevenueTrend/2)/1000).toFixed(0)}k</text>
                  <text x="40" y="173" fill="#71717a" fontSize="9" textAnchor="end" fontWeight="bold">₹0</text>
                </svg>
              </div>
            )}
          </div>

          {/* Client Growth SVG Chart */}
          <div className="rounded-xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gold-500/5 blur-2xl rounded-full" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-4">
              Client Growth Timeline
            </h3>

            {clientGrowthData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">
                No growth statistics yet.
              </div>
            ) : (
              <div className="w-full flex flex-col justify-end">
                <svg viewBox="0 0 500 200" className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="50" y1="40" x2="470" y2="40" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="50" y1="105" x2="470" y2="105" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="50" y1="170" x2="470" y2="170" stroke="#52525b" strokeWidth="1" />

                  {/* Area Under Line */}
                  <path d={growthAreaPath} fill="url(#growthGrad)" />

                  {/* Connecting Line */}
                  <path d={growthLinePath} fill="none" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Data Circles & Value Tooltips */}
                  {growthPoints.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#black" stroke="#8b5cf6" strokeWidth="2.5" className="hover:r-7 transition-all cursor-pointer" />
                      <text x={p.x} y={p.y - 12} fill="#a78bfa" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {p.val}
                      </text>
                      <text x={p.x} y="190" fill="#71717a" fontSize="9" textAnchor="middle" fontWeight="bold">
                        {p.label}
                      </text>
                    </g>
                  ))}

                  {/* Y-axis values */}
                  <text x="40" y="45" fill="#71717a" fontSize="9" textAnchor="end" fontWeight="bold">{maxClientGrowth}</text>
                  <text x="40" y="110" fill="#71717a" fontSize="9" textAnchor="end" fontWeight="bold">{Math.round(maxClientGrowth/2)}</text>
                  <text x="40" y="173" fill="#71717a" fontSize="9" textAnchor="end" fontWeight="bold">0</text>
                </svg>
              </div>
            )}
          </div>

        </div>

        {/* Breakdown and Distributions Panel */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Service Distribution Chart Card */}
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-5 flex items-center gap-2">
              <FiList className="text-gold-500" />
              <span>Popular Service Distribution</span>
            </h3>

            {activeServicesList.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 italic text-xs">
                No active service registrations to map.
              </div>
            ) : (
              <div className="space-y-4">
                {activeServicesList.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-black dark:text-zinc-200">{item.name}</span>
                      <span className="font-semibold text-zinc-400">
                        {item.count} {item.count === 1 ? 'Client' : 'Clients'} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-150 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          idx === 0 
                            ? 'bg-gradient-to-r from-gold-600 to-gold-400' 
                            : idx === 1 
                            ? 'bg-gradient-to-r from-blue-600 to-blue-400'
                            : 'bg-gradient-to-r from-zinc-600 to-zinc-400'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services Breakdown List Card */}
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-5">
              Services Breakdown Registry
            </h3>
            
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {serviceDistribution.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center p-2 border border-zinc-100 dark:border-zinc-900 rounded bg-zinc-50/50 dark:bg-zinc-900/10 text-xs"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                    {item.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    item.count > 0 
                      ? 'bg-gold-500/15 text-gold-500 border border-gold-500/20' 
                      : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/10'
                  }`}>
                    {item.count} Active
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Dashboard Panels Grid (Payments and System Activity) */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Recent Payments Panel */}
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white">
                Recent Payments Ledger
              </h3>
              <Link 
                href="/admin/payments"
                className="text-xs font-semibold text-gold-500 hover:text-gold-400 transition-colors"
              >
                View all payments
              </Link>
            </div>
            
            {(!recentPaymentsLimit || recentPaymentsLimit.length === 0) ? (
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
                    {recentPaymentsLimit.map((p) => (
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
          <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
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
