'use client'

import React, { useState, useTransition } from 'react'
import { 
  FiSettings, 
  FiFileText, 
  FiCpu, 
  FiCode, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiSave,
  FiChevronDown,
  FiChevronRight
} from 'react-icons/fi'
import { updateReminderTemplate } from '@/actions/admin-actions'
import { formatDate } from '@/lib/utils'

interface SettingsManagerProps {
  initialTemplates: any[]
  initialWebhookLogs: any[]
}

type PanelTab = 'webhook_info' | 'reminder_editor' | 'logs_viewer';

export default function SettingsManager({ initialTemplates, initialWebhookLogs }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('webhook_info')
  const [templates, setTemplates] = useState(initialTemplates)
  const [webhookLogs] = useState(initialWebhookLogs)
  const [isPending, startTransition] = useTransition()

  // Template editor states
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '')
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)
  
  const [tempSubject, setTempSubject] = useState(selectedTemplate?.email_subject || '')
  const [tempBody, setTempBody] = useState(selectedTemplate?.email_body || '')
  const [tempWhatsappBody, setTempWhatsappBody] = useState(selectedTemplate?.whatsapp_body || '')

  // Log expand states
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const [message, setMessage] = useState({ error: '', success: '' })

  const clearMessages = () => setMessage({ error: '', success: '' })

  const handleTemplateChange = (id: string) => {
    clearMessages()
    setSelectedTemplateId(id)
    const t = templates.find(temp => temp.id === id)
    if (t) {
      setTempSubject(t.email_subject)
      setTempBody(t.email_body)
      setTempWhatsappBody(t.whatsapp_body)
    }
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (!selectedTemplateId) return

    startTransition(async () => {
      const res = await updateReminderTemplate(selectedTemplateId, tempSubject, tempBody, tempWhatsappBody)
      if (res.error) {
        setMessage({ error: res.error, success: '' })
      } else {
        setMessage({ error: '', success: 'Reminder template updated.' })
        setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? {
          ...t,
          email_subject: tempSubject,
          email_body: tempBody,
          whatsapp_body: tempWhatsappBody
        } : t))
      }
    })
  }

  return (
    <div className="space-y-6">
      
      {/* Top Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-900 overflow-x-auto">
        <button
          onClick={() => setActiveTab('webhook_info')}
          className={`py-3 px-4 font-semibold text-xs tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'webhook_info'
              ? 'border-gold-500 text-gold-500 font-bold'
              : 'border-transparent text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <FiCpu className="inline-block mr-1.5 -mt-0.5" />
          <span>Webhook Endpoints</span>
        </button>
        <button
          onClick={() => setActiveTab('reminder_editor')}
          className={`py-3 px-4 font-semibold text-xs tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'reminder_editor'
              ? 'border-gold-500 text-gold-500 font-bold'
              : 'border-transparent text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <FiFileText className="inline-block mr-1.5 -mt-0.5" />
          <span>Reminder Templates</span>
        </button>
        <button
          onClick={() => setActiveTab('logs_viewer')}
          className={`py-3 px-4 font-semibold text-xs tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'logs_viewer'
              ? 'border-gold-500 text-gold-500 font-bold'
              : 'border-transparent text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <FiCode className="inline-block mr-1.5 -mt-0.5" />
          <span>Automation Webhook Logs</span>
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

      {/* Webhook API Docs Tab */}
      {activeTab === 'webhook_info' && (
        <div className="space-y-6 max-w-3xl">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 space-y-4">
            <h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
              <FiCpu className="text-gold-500" />
              <span>Make.com & Zapier Integration Ready</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              NzxtGen CRM dispatches real-time JSON webhooks when key events occur on your portal. You can copy the endpoints below and hook them directly inside Make.com webhooks connectors.
            </p>
            <div className="space-y-3 pt-2 text-xs">
              <div className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-900 rounded-lg p-4">
                <span className="font-semibold text-zinc-500 block uppercase tracking-wider text-[9px]">Trigger Webhook URL Target</span>
                <code className="text-gold-500 font-bold block mt-1 break-all bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-900">
                  {process.env.MAKE_WEBHOOK_URL || 'https://hook.us1.make.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                </code>
                <span className="text-[10px] text-zinc-400 mt-2 block italic">Configure MAKE_WEBHOOK_URL in environment files to direct outgoing payloads.</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 space-y-4">
            <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Supported Outbound Events</h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              {[
                { event: 'new_client_added', desc: 'Dispatched when adding a client profile' },
                { event: 'payment_recorded', desc: 'Dispatched when logging client transaction' },
                { event: 'invoice_uploaded', desc: 'Dispatched when contract invoice is uploaded' },
                { event: 'report_uploaded', desc: 'Dispatched when marketing analytics is uploaded' },
                { event: 'service_updated', desc: 'Dispatched when client service details change' },
                { event: 'due_date_reminder', desc: 'Dispatched manually or by automated reminders' },
                { event: 'client_activated', desc: 'Dispatched on client re-activation' },
                { event: 'client_suspended', desc: 'Dispatched on client account suspension' },
              ].map((ev) => (
                <div key={ev.event} className="p-3 border border-zinc-100 dark:border-zinc-900 rounded-lg">
                  <strong className="text-black dark:text-white font-mono text-[11px]">{ev.event}</strong>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{ev.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reminder Editor Tab */}
      {activeTab === 'reminder_editor' && (
        <div className="max-w-2xl">
          {templates.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No templates available. Please seed database reminder templates.</p>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 space-y-6">
              
              {/* Select template */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Template to Edit</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-900 text-xs font-semibold text-black dark:text-white"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Template Editor Form */}
              <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
                
                {/* Email Subject */}
                <div>
                  <label className="block text-zinc-500 mb-1">Email Subject Header</label>
                  <input
                    type="text"
                    required
                    value={tempSubject}
                    onChange={(e) => setTempSubject(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-900 text-black dark:text-white outline-none focus:border-gold-500/60"
                  />
                </div>

                {/* Email Body */}
                <div>
                  <label className="block text-zinc-500 mb-1">Email HTML / Text Body</label>
                  <textarea
                    required
                    rows={6}
                    value={tempBody}
                    onChange={(e) => setTempBody(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-900 text-black dark:text-white font-mono text-[11px] outline-none focus:border-gold-500/60"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">Merge fields available: <code className="text-zinc-600 dark:text-zinc-300">{"{{name}}"}</code>, <code className="text-zinc-600 dark:text-zinc-300">{"{{email}}"}</code>, <code className="text-zinc-600 dark:text-zinc-300">{"{{amount}}"}</code>, <code className="text-zinc-600 dark:text-zinc-300">{"{{due_date}}"}</code>, <code className="text-zinc-600 dark:text-zinc-300">{"{{service_name}}"}</code></span>
                </div>

                {/* WhatsApp Template Ready Text */}
                <div>
                  <label className="block text-zinc-500 mb-1">WhatsApp Template Text Ready</label>
                  <textarea
                    required
                    rows={3}
                    value={tempWhatsappBody}
                    onChange={(e) => setTempWhatsappBody(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-900 text-black dark:text-white font-mono text-[11px] outline-none focus:border-gold-500/60"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">Merge fields available: <code className="text-zinc-600 dark:text-zinc-300">{"{{name}}"}</code>, <code className="text-zinc-600 dark:text-zinc-300">{"{{amount}}"}</code>, <code className="text-zinc-600 dark:text-zinc-300">{"{{portal_url}}"}</code></span>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded bg-gradient-to-r from-gold-600 to-gold-400 py-2 px-4 text-xs font-bold text-black disabled:opacity-50"
                  >
                    <FiSave className="w-3.5 h-3.5" />
                    <span>{isPending ? 'Saving template...' : 'Save Template Updates'}</span>
                  </button>
                </div>

              </form>

            </div>
          )}
        </div>
      )}

      {/* Webhook Logs Viewer Tab */}
      {activeTab === 'logs_viewer' && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-900 dark:bg-zinc-950/40 shadow-sm text-xs">
          {webhookLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
              <FiCode className="w-10 h-10 stroke-1 mb-2 text-zinc-300 dark:text-zinc-800" />
              <p className="font-semibold">No webhook activities logged</p>
              <p className="text-[10px]">Operations like client additions or payment creations will populate logs.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-150 dark:divide-zinc-900/50">
              {webhookLogs.map((log) => {
                const isExpanded = expandedLogId === log.id
                return (
                  <div key={log.id} className="transition-colors hover:bg-zinc-50/20 dark:hover:bg-zinc-900/5">
                    {/* Log Row Header */}
                    <div 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="flex items-center justify-between p-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <FiChevronDown className="text-zinc-400" /> : <FiChevronRight className="text-zinc-400" />}
                        <span className="font-bold text-black dark:text-white font-mono">
                          {log.event_type}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          log.response_status === 200 || log.response_status === 201
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                        }`}>
                          HTTP {log.response_status || 'LOCAL'}
                        </span>
                      </div>
                    </div>

                    {/* Log Row Expandable Body */}
                    {isExpanded && (
                      <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-900/50 space-y-3">
                        <div>
                          <strong className="text-[10px] uppercase text-zinc-400 block mb-1">Payload Body</strong>
                          <pre className="p-3 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-900 overflow-x-auto text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                        {log.response_body && (
                          <div>
                            <strong className="text-[10px] uppercase text-zinc-400 block mb-1">Integration Response</strong>
                            <pre className="p-3 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-900 overflow-x-auto text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                              {log.response_body}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
