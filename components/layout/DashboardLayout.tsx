'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'super_admin' | 'client'
  email: string
  title: string
}

export default function DashboardLayout({
  children,
  role,
  email,
  title,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-black">
      {/* Desktop Sidebar (visible on large screen) */}
      <div className="hidden lg:flex lg:shrink-0 h-full">
        <Sidebar role={role} email={email} />
      </div>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="relative z-40 lg:hidden">
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs transition-transform duration-300 ease-in-out">
            <Sidebar 
              role={role} 
              email={email} 
              onClose={() => setSidebarOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar title={title} onMenuToggle={() => setSidebarOpen(true)} />

        {/* Dynamic page content wrapper */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
