'use client'

import React, { useState, useTransition } from 'react'
import { 
  FiSearch, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiUserX, 
  FiUserCheck, 
  FiDollarSign, 
  FiTrendingUp, 
  FiCheckCircle, 
  FiAlertCircle,
  FiX,
  FiCalendar,
  FiUser
} from 'react-icons/fi'
import { 
  addClient, 
  editClient, 
  deleteClient, 
  setClientStatus, 
  addTask, 
  editTask, 
  deleteTask, 
  toggleTaskComplete 
} from '@/actions/admin-actions'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ClientsManagerProps {
  initialClients: any[]
  services: any[]
}

export default function ClientsManager({ initialClients, services }: ClientsManagerProps) {
  const [clients, setClients] = useState(initialClients)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  
  // Modals visibility state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingClientData, setEditingClientData] = useState<any | null>(null)
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  // Task manager state
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskStatus, setTaskStatus] = useState('pending')

  // Status message
  const [message, setMessage] = useState({ error: '', success: '' })

  const clearMessages = () => setMessage({ error: '', success: '' })

  // Search filter
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearMessages()
    
    if (selectedServiceIds.length === 0) {
      setMessage({ error: 'Please select at least one service.', success: '' })
      return
    }

    const formData = new FormData(e.currentTarget)
    // serviceIds are already appended via hidden inputs
    
    startTransition(async () => {
      const res = await addClient(formData)
      if (res.error) {
        setMessage({ error: res.error, success: '' })
      } else {
        setMessage({ error: '', success: 'Client account successfully created and welcome alerts sent!' })
        setIsAddOpen(false)
        setSelectedServiceIds([])
        window.location.reload()
      }
    })
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearMessages()

    const formData = new FormData(e.currentTarget)
    const id = editingClientData.id

    startTransition(async () => {
      const res = await editClient(id, formData)
      if (res.error) {
        setMessage({ error: res.error, success: '' })
      } else {
        setMessage({ error: '', success: 'Client profile updated.' })
        setEditingClientData(null)
        window.location.reload()
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? All connected services, payments, and files will be deleted.')) return
    
    startTransition(async () => {
      const res = await deleteClient(id)
      if (res.error) {
        alert(res.error)
      } else {
        setClients(prev => prev.filter(c => c.id !== id))
        if (selectedClientDetail?.id === id) setSelectedClientDetail(null)
      }
    })
  }

  const handleStatusToggle = async (id: string, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
    
    startTransition(async () => {
      const res = await setClientStatus(id, nextStatus)
      if (res.error) {
        alert(res.error)
      } else {
        setClients(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c))
        if (selectedClientDetail?.id === id) {
          setSelectedClientDetail((prev: any) => prev ? { ...prev, status: nextStatus } : null)
        }
      }
    })
  }

  // Task handlers
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('clientId', selectedClientDetail.id)
    formData.append('title', taskTitle)
    formData.append('description', taskDesc)
    formData.append('priority', taskPriority)
    formData.append('dueDate', taskDueDate)

    startTransition(async () => {
      const res = await addTask(formData)
      if (res.error) {
        alert(res.error)
      } else {
        setIsAddingTask(false)
        setTaskTitle('')
        setTaskDesc('')
        setTaskPriority('medium')
        setTaskDueDate('')
        window.location.reload()
      }
    })
  }

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('taskId', editingTask.id)
    formData.append('title', taskTitle)
    formData.append('description', taskDesc)
    formData.append('priority', taskPriority)
    formData.append('status', taskStatus)
    formData.append('dueDate', taskDueDate)

    startTransition(async () => {
      const res = await editTask(formData)
      if (res.error) {
        alert(res.error)
      } else {
        setEditingTask(null)
        setTaskTitle('')
        setTaskDesc('')
        setTaskPriority('medium')
        setTaskDueDate('')
        setTaskStatus('pending')
        window.location.reload()
      }
    })
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    startTransition(async () => {
      const res = await deleteTask(taskId)
      if (res.error) {
        alert(res.error)
      } else {
        window.location.reload()
      }
    })
  }

  const handleToggleTask = async (task: any) => {
    startTransition(async () => {
      const res = await toggleTaskComplete(task.id, task.status)
      if (res.error) {
        alert(res.error)
      } else {
        window.location.reload()
      }
    })
  }

  // Calculate task completions for selected client
  const clientTasks = selectedClientDetail?.tasks || []
  const totalTasks = clientTasks.length
  const completedTasks = clientTasks.filter((t: any) => t.status === 'completed').length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

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
            placeholder="Search by name, business or email..."
            className="block w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 dark:border-zinc-900 dark:bg-zinc-950 dark:text-white"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => { clearMessages(); setSelectedServiceIds([]); setIsAddOpen(true) }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-400 py-2 px-4 text-sm font-bold text-black shadow-lg shadow-gold-500/5 hover:from-gold-500 hover:to-gold-300 transition-all shrink-0 cursor-pointer"
        >
          <FiPlus className="w-4 h-4 stroke-[3]" />
          <span>Add Client</span>
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

      {/* Main Table & Detail view grid */}
      <div className="grid gap-6 lg:grid-cols-3 items-start font-sans">
        
        {/* Table List Panel */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-900 dark:bg-zinc-950/40 lg:col-span-2 shadow-sm">
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-500">
              <FiUserX className="w-12 h-12 stroke-1 mb-3 text-zinc-300 dark:text-zinc-800" />
              <p className="text-sm font-semibold">No clients found</p>
              <p className="text-xs mt-1">Try refining your search or add a new client profile.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/10 text-zinc-500">
                    <th className="p-4 font-semibold">Client Name</th>
                    <th className="p-4 font-semibold">Business</th>
                    <th className="p-4 font-semibold">Services</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/50">
                  {filteredClients.map((c) => {
                    const servicesList = c.client_services || []
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => setSelectedClientDetail(c)}
                        className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors cursor-pointer ${
                          selectedClientDetail?.id === c.id ? 'bg-zinc-50 dark:bg-zinc-900/20' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-black dark:text-white">
                          {c.name}
                        </td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400">{c.business_name}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {servicesList.length > 0 ? (
                              servicesList.map((cs: any) => (
                                <span 
                                  key={cs.id} 
                                  className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium text-[9px] border border-zinc-200 dark:border-zinc-800"
                                >
                                  {cs.services?.name || cs.custom_name || 'Service'}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-zinc-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            c.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { clearMessages(); setEditingClientData(c) }}
                            className="p-1 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                            title="Edit profile"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(c.id, c.status)}
                            className={`p-1 transition-colors ${
                              c.status === 'active' 
                                ? 'text-zinc-400 hover:text-amber-500' 
                                : 'text-zinc-400 hover:text-emerald-500'
                            }`}
                            title={c.status === 'active' ? 'Suspend client' : 'Activate client'}
                          >
                            {c.status === 'active' ? <FiUserX className="w-3.5 h-3.5" /> : <FiUserCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slide-out or Static Detail Drawer Panel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40 shadow-sm min-h-[400px]">
          {!selectedClientDetail ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-center py-20">
              <FiSearch className="w-8 h-8 stroke-1 text-zinc-300 dark:text-zinc-800 mb-2" />
              <p className="text-xs font-semibold">Select a client from the table</p>
              <p className="text-[10px] mt-0.5">To inspect services, tasks, payments and billing details.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Detail Header */}
              <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white">
                    {selectedClientDetail.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {selectedClientDetail.business_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedClientDetail(null)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Service Info Block */}
              <div>
                <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FiDollarSign className="w-3.5 h-3.5 text-gold-500" />
                  <span>Purchased Services</span>
                </h4>
                
                {selectedClientDetail.client_services && selectedClientDetail.client_services.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedClientDetail.client_services.map((cs: any) => (
                      <div key={cs.id} className="space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-xl p-4 border border-zinc-100 dark:border-zinc-900/50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-black dark:text-white text-[13px]">
                            {cs.services?.name || cs.custom_name || 'Service'}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            cs.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}>
                            {cs.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[11px] pt-2 border-t border-zinc-100 dark:border-zinc-900/50">
                          <div>
                            <span className="text-zinc-500">Service Cost</span>
                            <p className="font-bold text-black dark:text-white text-sm mt-0.5">
                              {formatCurrency(cs.total_cost)}
                            </p>
                          </div>
                          <div>
                            <span className="text-zinc-500">Advance Paid</span>
                            <p className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                              {formatCurrency(cs.advance_paid)}
                            </p>
                          </div>
                          <div>
                            <span className="text-zinc-500">Remaining Balance</span>
                            <p className={`font-bold mt-0.5 ${
                              Number(cs.remaining_balance) > 0 ? 'text-gold-500' : 'text-emerald-500'
                            }`}>
                              {formatCurrency(cs.remaining_balance)}
                            </p>
                          </div>
                          <div>
                            <span className="text-zinc-500">Contract Span</span>
                            <p className="text-zinc-700 dark:text-zinc-300 mt-0.5">
                              {formatDate(cs.start_date)} - {cs.end_date ? formatDate(cs.end_date) : 'Ongoing'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No services registered for this client.</p>
                )}
              </div>

              {/* Client Task Manager Block */}
              <div>
                <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FiCheckCircle className="w-3.5 h-3.5 text-gold-500" />
                  <span>Client Task Manager</span>
                </h4>

                <div className="bg-zinc-50/50 dark:bg-zinc-900/10 rounded-xl p-4 border border-zinc-100 dark:border-zinc-900/50 space-y-4">
                  
                  {/* Progress Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                      <span>Tasks: {completedTasks}/{totalTasks} Completed</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-200/20">
                      <div 
                        className="bg-gradient-to-r from-gold-600 to-gold-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Task List */}
                  {clientTasks.length > 0 ? (
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                      {clientTasks.map((task: any) => {
                        const isCompleted = task.status === 'completed'
                        
                        let priorityColor = 'bg-zinc-500/10 text-zinc-500'
                        if (task.priority === 'urgent') priorityColor = 'bg-red-500/10 text-red-500 border border-red-500/20'
                        else if (task.priority === 'high') priorityColor = 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        else if (task.priority === 'medium') priorityColor = 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        
                        return (
                          <div 
                            key={task.id} 
                            className={`flex items-start justify-between p-2.5 rounded-lg border text-[11px] transition-all ${
                              isCompleted 
                                ? 'border-zinc-100 dark:border-zinc-900 bg-zinc-50/10 opacity-60' 
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleTask(task)}
                                className={`mt-0.5 p-0.5 rounded-md border hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer ${
                                  isCompleted ? 'border-emerald-500 text-emerald-500' : 'border-zinc-300 dark:border-zinc-700 text-transparent'
                                }`}
                              >
                                <FiCheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className={`font-bold text-black dark:text-white truncate ${isCompleted ? 'line-through' : ''}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 text-[9px]">
                                  <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase ${priorityColor}`}>
                                    {task.priority}
                                  </span>
                                  <span className="text-zinc-400">
                                    Due: {formatDate(task.due_date)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Task Edit/Delete Actions */}
                            <div className="flex items-center gap-1.5 ml-2">
                              <button
                                onClick={() => {
                                  setEditingTask(task)
                                  setTaskTitle(task.title)
                                  setTaskDesc(task.description || '')
                                  setTaskPriority(task.priority)
                                  setTaskStatus(task.status)
                                  setTaskDueDate(task.due_date)
                                }}
                                className="p-1 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic py-2 text-center">No tasks assigned.</p>
                  )}

                  {/* Inline Add Task Toggle / Form */}
                  {isAddingTask ? (
                    <form onSubmit={handleAddTaskSubmit} className="border-t border-zinc-100 dark:border-zinc-900 pt-3.5 space-y-3">
                      <h5 className="font-bold text-black dark:text-white text-[10px] uppercase">New Client Task</h5>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Task title..."
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          required
                          className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                        />
                        <textarea
                          placeholder="Task description..."
                          value={taskDesc}
                          onChange={(e) => setTaskDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-zinc-500 mb-1 text-[9px]">Priority</label>
                            <select
                              value={taskPriority}
                              onChange={(e) => setTaskPriority(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-500 mb-1 text-[9px]">Due Date</label>
                            <input
                              type="date"
                              value={taskDueDate}
                              onChange={(e) => setTaskDueDate(e.target.value)}
                              required
                              className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingTask(false)}
                          className="py-1 px-2.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-750 font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="py-1 px-3.5 rounded bg-gold-500 text-black font-bold hover:bg-gold-400"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  ) : editingTask ? (
                    <form onSubmit={handleEditTaskSubmit} className="border-t border-zinc-100 dark:border-zinc-900 pt-3.5 space-y-3">
                      <h5 className="font-bold text-black dark:text-white text-[10px] uppercase">Modify Task</h5>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Task title..."
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          required
                          className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                        />
                        <textarea
                          placeholder="Task description..."
                          value={taskDesc}
                          onChange={(e) => setTaskDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-zinc-500 mb-1 text-[9px]">Priority</label>
                            <select
                              value={taskPriority}
                              onChange={(e) => setTaskPriority(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-500 mb-1 text-[9px]">Status</label>
                            <select
                              value={taskStatus}
                              onChange={(e) => setTaskStatus(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-500 mb-1 text-[9px]">Due Date</label>
                            <input
                              type="date"
                              value={taskDueDate}
                              onChange={(e) => setTaskDueDate(e.target.value)}
                              required
                              className="w-full bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-[11px]"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTask(null)
                            setTaskTitle('')
                            setTaskDesc('')
                            setTaskDueDate('')
                          }}
                          className="py-1 px-2.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-750 font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="py-1 px-3.5 rounded bg-gold-500 text-black font-bold hover:bg-gold-400"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setIsAddingTask(true)
                          setTaskTitle('')
                          setTaskDesc('')
                          setTaskPriority('medium')
                          setTaskDueDate(new Date().toISOString().split('T')[0])
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-gold-500 hover:text-gold-400 transition-colors cursor-pointer bg-zinc-900 border border-zinc-800 hover:bg-zinc-950 py-1.5 px-3 rounded-lg"
                      >
                        <FiPlus className="w-3 h-3 stroke-[3]" />
                        <span>Add Client Task</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Client Notes & Details */}
              <div className="text-xs border-t border-zinc-100 dark:border-zinc-900 pt-4 space-y-2.5 text-zinc-600 dark:text-zinc-400">
                <div>
                  <span className="font-semibold text-zinc-500 uppercase tracking-wide text-[9px] block">WhatsApp Contact</span>
                  <span className="text-black dark:text-white font-medium">{selectedClientDetail.whatsapp_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-500 uppercase tracking-wide text-[9px] block">Phone Contact</span>
                  <span className="text-black dark:text-white font-medium">{selectedClientDetail.phone_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-500 uppercase tracking-wide text-[9px] block">Internal Notes</span>
                  <span className="text-zinc-600 dark:text-zinc-300 block bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 border border-zinc-100 dark:border-zinc-900/50 rounded-lg mt-1 whitespace-pre-line leading-relaxed">
                    {selectedClientDetail.notes || 'No comments logged.'}
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Add Client Dialog Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-4">
              <h3 className="text-base font-bold text-black dark:text-white">Add New Client Account</h3>
              <button 
                onClick={() => setIsAddOpen(false)} 
                className="p-1 text-zinc-400 hover:text-black dark:hover:text-white"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              
              {/* Profile Details */}
              <div className="bg-zinc-50/50 dark:bg-zinc-900/20 p-4 border border-zinc-100 dark:border-zinc-900 rounded-xl space-y-3">
                <h4 className="font-bold text-black dark:text-white uppercase tracking-wider text-[10px] border-b border-zinc-100 dark:border-zinc-900 pb-1.5">1. Client Profile</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 mb-1">Client Full Name *</label>
                    <input type="text" name="name" required placeholder="John Doe" className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Business Name *</label>
                    <input type="text" name="businessName" required placeholder="Stripe Inc." className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-zinc-500 mb-1">Email (Auth Login ID) *</label>
                    <input type="email" name="email" required placeholder="john@doe.com" className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Phone Contact</label>
                    <input type="text" name="phoneNumber" placeholder="+12345678" className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 mb-1">WhatsApp Number (For Auto Logs)</label>
                    <input type="text" name="whatsappNumber" placeholder="+12345678" className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                </div>
              </div>

              {/* Service Provisioning */}
              <div className="bg-zinc-50/50 dark:bg-zinc-900/20 p-4 border border-zinc-100 dark:border-zinc-900 rounded-xl space-y-3">
                <h4 className="font-bold text-black dark:text-white uppercase tracking-wider text-[10px] border-b border-zinc-100 dark:border-zinc-900 pb-1.5">2. Service & Billing Setup</h4>
                
                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">Select Purchased Services (One or multiple) *</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {services.map((s: any) => {
                      const isSelected = selectedServiceIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedServiceIds(prev => 
                              prev.includes(s.id) 
                                ? prev.filter(id => id !== s.id) 
                                : [...prev, s.id]
                            )
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-gold-500 bg-gold-500/10 text-gold-500 font-bold' 
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-[11px]">{s.name}</span>
                          {isSelected && <FiCheckCircle className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                        </button>
                      )
                    })}
                  </div>
                  {/* Hidden inputs to bind service ids in form body */}
                  {selectedServiceIds.map(id => (
                    <input key={id} type="hidden" name="serviceIds" value={id} />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Total Contract Cost (₹) *</label>
                    <input type="number" step="0.01" name="serviceCost" required placeholder="150000" className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Advance Paid (₹)</label>
                    <input type="number" step="0.01" name="advancePaid" placeholder="50000" className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Start Date</label>
                    <input type="date" name="startDate" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-zinc-500 mb-1 font-semibold">End Date (Optional)</label>
                    <input type="date" name="endDate" className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Internal Notes</label>
                <textarea name="notes" rows={3} placeholder="Project scope, client specifications..." className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
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
                  {isPending ? 'Provisioning...' : 'Confirm Account'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Edit Client Profile Modal */}
      {editingClientData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-4">
              <h3 className="text-base font-bold text-black dark:text-white">Modify Client Details</h3>
              <button 
                onClick={() => setEditingClientData(null)} 
                className="p-1 text-zinc-400 hover:text-black dark:hover:text-white"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-zinc-500 mb-1">Client Name</label>
                <input type="text" name="name" required defaultValue={editingClientData.name} className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Business Name</label>
                <input type="text" name="businessName" required defaultValue={editingClientData.business_name} className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Phone Contact</label>
                  <input type="text" name="phoneNumber" defaultValue={editingClientData.phone_number || ''} className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">WhatsApp Contact</label>
                  <input type="text" name="whatsappNumber" defaultValue={editingClientData.whatsapp_number || ''} className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Client Comments / Notes</label>
                <textarea name="notes" rows={4} defaultValue={editingClientData.notes || ''} className="w-full rounded p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white" />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setEditingClientData(null)}
                  className="py-2 px-4 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="py-2 px-5 rounded bg-gradient-to-r from-gold-600 to-gold-400 text-black font-extrabold disabled:opacity-50"
                >
                  {isPending ? 'Updating...' : 'Save Updates'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
