import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { 
  FiArrowRight, 
  FiMonitor, 
  FiSearch, 
  FiTrendingUp, 
  FiUsers, 
  FiLock 
} from 'react-icons/fi'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  // Check if session is already active to redirect or display Dashboard CTA
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let dashboardUrl = '/portal-login'
  let roleLabel = ''

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role
    dashboardUrl = role === 'super_admin' ? '/admin' : '/client'
    roleLabel = role === 'super_admin' ? 'Go to Admin Console' : 'Go to Client Portal'
  }

  const features = [
    {
      title: 'PPC Search Campaigns',
      desc: 'High-intent search advertising delivering lead flow and positive return-on-ad-spend (ROAS).',
      icon: FiTrendingUp,
    },
    {
      title: 'SEO Audit & Rankings',
      desc: 'Dominate organic rankings through tech SEO compliance, content scaling, and backlink authority.',
      icon: FiSearch,
    },
    {
      title: 'Conversion CRO',
      desc: 'Optimizing landing pages and digital funnels to turn traffic clicks into paying customers.',
      icon: FiMonitor,
    },
    {
      title: 'SaaS Client Portal',
      desc: 'Fully transparent access to project files, invoices, ad budgets, and periodic performance reports.',
      icon: FiLock,
    },
  ]

  return (
    <div className="flex flex-col flex-1 bg-black text-white min-h-screen relative overflow-hidden font-sans">
      
      {/* Visual Ambient Lights */}
      <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-gold-500/5 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-gold-500/5 blur-[160px] rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between z-10 backdrop-blur-md bg-black/40 sticky top-0">
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Nzxt<span className="text-gold-500">Gen</span>
          </span>
          <span className="text-[10px] text-zinc-500 tracking-wider font-semibold uppercase -mt-1">
            Digital Services
          </span>
        </div>

        <Link 
          href={dashboardUrl}
          className="rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-950 py-2.5 px-4 transition-colors flex items-center gap-1.5"
        >
          {user ? (
            <>
              <span>{roleLabel}</span>
              <FiArrowRight className="w-3.5 h-3.5 text-gold-500" />
            </>
          ) : (
            <>
              <span>Portal Login</span>
              <FiLock className="w-3.5 h-3.5 text-gold-500" />
            </>
          )}
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 md:py-32 flex flex-col items-center justify-center text-center z-10 space-y-8">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-500/20 bg-gold-500/5 text-xs font-semibold text-gold-400">
          <FiUsers className="w-3.5 h-3.5" />
          <span>Premium Digital Growth Agency</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Turning <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-amber-300">Clicks</span> Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">Customers</span>.
        </h1>

        <p className="text-sm md:text-base text-zinc-400 max-w-xl leading-relaxed">
          We engineer high-performance search campaigns, conversion funnels, and organic growth channels to scale your customer acquisitions. Completely transparent. Performance-first.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 max-w-2xl w-full pt-6">
          
          {/* Card A: Client Portal */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6 flex flex-col justify-between items-center text-center space-y-4 hover:border-gold-500/20 hover:bg-zinc-950 transition-all">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Client Portal</h3>
              <p className="text-xs text-zinc-400 max-w-[220px]">
                Access active marketing campaigns, monitor ad budgets, and download statements.
              </p>
            </div>
            <Link 
              href="/portal-login"
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-gold-600 to-gold-400 py-2.5 px-4 text-xs font-bold text-black shadow-md hover:from-gold-500 hover:to-gold-300 transition-all cursor-pointer"
            >
              <span>Client Login</span>
              <FiArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>

          {/* Card B: Admin Portal */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6 flex flex-col justify-between items-center text-center space-y-4 hover:border-gold-500/20 hover:bg-zinc-950 transition-all">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Admin Portal</h3>
              <p className="text-xs text-zinc-400 max-w-[220px]">
                Register client profiles, update marketing budgets, and manage financial ledgers.
              </p>
            </div>
            <Link 
              href="/admin-login"
              className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-zinc-805 bg-zinc-900/60 py-2.5 px-4 text-xs font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all hover:border-zinc-700 cursor-pointer"
            >
              <span>Admin Login</span>
              <FiLock className="w-3.5 h-3.5 text-gold-500" />
            </Link>
          </div>

        </div>

      </main>

      {/* Services Section */}
      <section id="services" className="border-t border-zinc-900 py-24 bg-zinc-950/20 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Our Capabilities</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Scaling customer flow at every layer</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <div 
                  key={feat.title}
                  className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-6 flex gap-4 text-xs transition-colors hover:border-zinc-850"
                >
                  <div className="rounded-lg bg-zinc-900 p-2.5 text-gold-500 border border-zinc-850 h-10 w-10 shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white mb-2">{feat.title}</h3>
                    <p className="text-zinc-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-950 py-12 bg-black z-10 text-center text-xs text-zinc-600">
        <div className="max-w-5xl mx-auto px-6">
          <p>© {new Date().getFullYear()} NzxtGen Digital Services. All rights reserved.</p>
          <p className="mt-1 text-[10px] text-zinc-700">Turning Clicks Into Customers</p>
        </div>
      </footer>

    </div>
  )
}
