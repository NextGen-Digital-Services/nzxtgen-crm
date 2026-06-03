'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FiGrid, 
  FiUsers, 
  FiDollarSign, 
  FiFileText, 
  FiSettings, 
  FiLogOut,
  FiX
} from 'react-icons/fi'
import { logout } from '@/actions/auth-actions'

interface SidebarProps {
  role: 'super_admin' | 'client'
  email: string
  onClose?: () => void
}

export default function Sidebar({ role, email, onClose }: SidebarProps) {
  const pathname = usePathname()

  const adminLinks = [
    { name: 'Overview', href: '/admin', icon: FiGrid },
    { name: 'Clients', href: '/admin/clients', icon: FiUsers },
    { name: 'Payments', href: '/admin/payments', icon: FiDollarSign },
    { name: 'Documents', href: '/admin/documents', icon: FiFileText },
    { name: 'Automation', href: '/admin/settings', icon: FiSettings },
  ]

  const clientLinks = [
    { name: 'Portal Home', href: '/client', icon: FiGrid },
    { name: 'Payments', href: '/client/payments', icon: FiDollarSign },
    { name: 'Documents', href: '/client/documents', icon: FiFileText },
  ]

  const links = role === 'super_admin' ? adminLinks : clientLinks

  const handleLogout = async () => {
    await logout(role)
  }

  return (
    <div className="flex flex-col h-full bg-black text-zinc-100 border-r border-zinc-900 w-64">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-900">
        <Link href="/" className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Nzxt<span className="text-gold-500">Gen</span>
          </span>
          <span className="text-[10px] text-zinc-500 tracking-wider font-semibold uppercase -mt-1">
            Digital Services
          </span>
        </Link>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white lg:hidden"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/') && link.href !== '/admin' && link.href !== '/client'
          const Icon = link.icon

          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group duration-200 ${
                isActive
                  ? 'bg-zinc-900 text-gold-400 border-l-2 border-gold-500 pl-3.5 shadow-sm shadow-gold-500/5'
                  : 'text-zinc-400 hover:bg-zinc-950 hover:text-white border-l-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 ${
                isActive ? 'text-gold-500' : 'text-zinc-500 group-hover:text-zinc-300'
              }`} />
              {link.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer Profile Block */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/40">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">
              Logged in as
            </span>
            <span className="text-sm font-medium text-white truncate" title={email}>
              {email}
            </span>
            <span className="text-[10px] font-semibold text-gold-500 tracking-wider uppercase mt-0.5">
              {role === 'super_admin' ? 'Super Admin' : 'Client Profile'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-zinc-900/60 border border-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
