'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FiMenu, FiBell, FiCheck, FiX } from 'react-icons/fi'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/types'
import { formatDate } from '@/lib/utils'

interface NavbarProps {
  title: string
  onMenuToggle: () => void
}

export default function Navbar({ title, onMenuToggle }: NavbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    let active = true
    let channel: any = null

    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data && active) {
        setNotifications(data)
      }
    }

    // Setup real-time notifications listener
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const tempChannel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (active) {
              setNotifications((prev) => [payload.new as Notification, ...prev.slice(0, 9)])
            }
          }
        )

      if (!active) return

      channel = tempChannel
      tempChannel.subscribe()
    }

    fetchNotifications()
    setupSubscription()

    // Handle clicks outside of dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      active = false
      document.removeEventListener('mousedown', handleClickOutside)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    }
  }

  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'welcome':
        return 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
      case 'payment_reminder':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'payment_confirmation':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'service_update':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-100 bg-white px-6 dark:border-zinc-900 dark:bg-black/80 dark:backdrop-blur-md">
      {/* Menu / Title Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 border border-zinc-100 text-zinc-500 hover:bg-zinc-50 hover:text-black dark:border-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white lg:hidden"
        >
          <FiMenu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-black dark:text-white">
          {title}
        </h1>
      </div>

      {/* Action Area Right */}
      <div className="flex items-center gap-4">
        {/* Notifications Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative rounded-lg p-2 border border-zinc-100 text-zinc-500 hover:bg-zinc-50 hover:text-black dark:border-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition-colors"
          >
            <FiBell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-500"></span>
              </span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {isOpen && (
            <div className="absolute right-0 mt-2.5 w-80 max-h-[480px] overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-lg dark:border-zinc-900 dark:bg-zinc-950/95 dark:backdrop-blur-lg flex flex-col">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                <span className="font-semibold text-sm text-black dark:text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-gold-500 text-black font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-gold-500 hover:text-gold-400 font-medium flex items-center gap-1"
                  >
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List Scroll */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900/50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 dark:text-zinc-500">
                    <FiBell className="w-8 h-8 stroke-1 text-zinc-300 dark:text-zinc-800 mb-2" />
                    <span className="text-xs font-medium">All caught up!</span>
                    <span className="text-[10px] mt-0.5">No notifications yet.</span>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors flex gap-3 relative ${
                        notification.read 
                          ? 'bg-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20' 
                          : 'bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/20'
                      }`}
                    >
                      {/* Left Badge Icon */}
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${getNotificationColor(notification.type)}`}>
                        <FiBell className="w-3.5 h-3.5" />
                      </div>

                      {/* Msg Details */}
                      <div className="flex-1 min-w-0 pr-4">
                        <p className={`text-xs font-semibold ${notification.read ? 'text-zinc-700 dark:text-zinc-300' : 'text-black dark:text-white'}`}>
                          {notification.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed break-words">
                          {notification.message}
                        </p>
                        <p className="text-[9px] text-zinc-400 mt-1">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>

                      {/* Close or Read actions */}
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="absolute right-3 top-4 text-zinc-400 hover:text-gold-500 p-0.5 rounded transition-colors"
                          title="Mark read"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
