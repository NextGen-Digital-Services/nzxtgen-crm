import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDate } from '@/lib/utils'
import { FiFileText, FiDownload, FiEye } from 'react-icons/fi'

export const dynamic = 'force-dynamic'

export default async function ClientDocumentsPage() {
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

  // 2. Fetch client profile
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    redirect('/client')
  }

  // 3. Query documents and reports for this client
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('client_id', client.id)
    .order('report_date', { ascending: false })

  return (
    <DashboardLayout 
      role={userRole} 
      email={user.email!} 
      title="Documents & Reports"
    >
      <div className="space-y-8">
        
        {/* Reports Panel */}
        <div className="rounded-xl border border-zinc-150 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-6 flex items-center gap-2">
            <FiFileText className="text-gold-500" />
            <span>Periodic Analytics & SEO Reports</span>
          </h3>

          {(!reports || reports.length === 0) ? (
            <div className="text-center py-8 text-zinc-400 italic text-xs">
              No performance reports compiled yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((rep) => (
                <div 
                  key={rep.id}
                  className="hover-gold-trigger flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50/20 p-5 dark:border-zinc-900 dark:bg-zinc-900/10 transition-all"
                >
                  <div>
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                      Report Date: {formatDate(rep.report_date)}
                    </span>
                    <h4 className="text-sm font-bold text-black dark:text-white mt-2.5 line-clamp-1" title={rep.title}>
                      {rep.title}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {rep.description || 'No summary comments.'}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 mt-6 pt-3.5 border-t border-zinc-100 dark:border-zinc-900/50">
                    <a 
                      href={rep.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors bg-white dark:bg-transparent"
                      title="Preview report"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                    </a>
                    <a 
                      href={rep.file_url} 
                      download
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors bg-white dark:bg-transparent"
                      title="Download report"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agreement Contracts & Project Files Panel */}
        <div className="rounded-xl border border-zinc-155 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-6 flex items-center gap-2">
            <FiFileText className="text-gold-500" />
            <span>Shared Client Files & Contracts</span>
          </h3>

          {(!documents || documents.filter(d => d.type !== 'report').length === 0) ? (
            <div className="text-center py-8 text-zinc-400 italic text-xs">
              No files shared yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.filter(d => d.type !== 'report').map((doc) => (
                <div 
                  key={doc.id}
                  className="hover-gold-trigger flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50/20 p-5 dark:border-zinc-900 dark:bg-zinc-900/10 transition-all"
                >
                  <div>
                    <span className="inline-flex rounded bg-gold-500/10 text-gold-500 border border-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      {doc.type.replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-black dark:text-white mt-3 line-clamp-1" title={doc.name}>
                      {doc.name}
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Uploaded on {formatDate(doc.created_at)}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 mt-6 pt-3.5 border-t border-zinc-100 dark:border-zinc-900/50">
                    <a 
                      href={doc.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors bg-white dark:bg-transparent"
                      title="Preview file"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                    </a>
                    <a 
                      href={doc.file_url} 
                      download
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors bg-white dark:bg-transparent"
                      title="Download file"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                    </a>
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
