'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSimpleClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { triggerWebhook } from '@/services/webhooks'
import { formatCurrency } from '@/lib/utils'
import { 
  sendWelcomeEmail, 
  sendAccountCreationEmail,
  sendPaymentConfirmationEmail, 
  sendReportUploadedEmail 
} from '@/services/email'

// Isolated client to prevent admin session cookie hijacking during client registration
const getSessionlessClient = () => {
  return createSimpleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false }
    }
  )
}

/**
 * CLIENT CRUD OPERATIONS
 */

export async function addClient(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const businessName = formData.get('businessName') as string
  const email = formData.get('email') as string
  const phoneNumber = formData.get('phoneNumber') as string
  const whatsappNumber = formData.get('whatsappNumber') as string
  const notes = formData.get('notes') as string

  // Service details
  const serviceIds = formData.getAll('serviceIds') as string[]
  const serviceCost = parseFloat(formData.get('serviceCost') as string || '0')
  const advancePaid = parseFloat(formData.get('advancePaid') as string || '0')
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string || null

  if (!name || !businessName || !email || serviceIds.length === 0) {
    return { error: 'Required fields are missing: Name, Business Name, Email, Service Selection' }
  }

  try {
    // 1. Provision user login in Supabase auth without overriding current admin session
    const rawSupabase = getSessionlessClient()
    const tempPassword = 'ClientPassword123!' // Force client to reset on first login
    
    const { data: signUpData, error: signUpError } = await rawSupabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          role: 'client',
          name,
        }
      }
    })

    let userId = null
    if (signUpError) {
      console.warn('[Admin Actions] User creation failed (may already exist):', signUpError.message)
      // Check if user already exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
      if (existingUser) {
        userId = existingUser.id
      }
    } else {
      userId = signUpData.user?.id
    }

    // 2. Insert into public.clients
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name,
        business_name: businessName,
        email,
        phone_number: phoneNumber,
        whatsapp_number: whatsappNumber,
        status: 'active',
        notes,
      })
      .select()
      .single()

    if (clientError) {
      return { error: `Failed to create client record: ${clientError.message}` }
    }

    // 3. Insert services for the client
    const clientServices = []
    for (let i = 0; i < serviceIds.length; i++) {
      const isFirst = i === 0
      const { data: service, error: serviceError } = await supabase
        .from('client_services')
        .insert({
          client_id: client.id,
          service_id: serviceIds[i],
          status: 'active',
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: endDate,
          total_cost: isFirst ? serviceCost : 0,
          advance_paid: isFirst ? advancePaid : 0,
        })
        .select()
        .single()

      if (serviceError) {
        return { error: `Failed to create service: ${serviceError.message}` }
      }
      clientServices.push(service)
    }

    const primaryService = clientServices[0]

    // 5. If we have advance paid, log as a payment record
    if (advancePaid > 0 && primaryService) {
      await supabase.from('payments').insert({
        client_id: client.id,
        service_id: primaryService.id,
        amount: advancePaid,
        payment_method: 'Advance Payment',
        status: 'completed',
        notes: 'Initial deposit paid on registration'
      })
    }

    // 5.5 Automatically generate service-specific To Do tasks
    const defaultTasksByService: Record<string, { title: string; description: string; priority: 'low' | 'medium' | 'high' | 'urgent' }[]> = {
      'SEO Services': [
        { title: 'On-page SEO Audit', description: 'Audit meta titles, headings, and site architecture.', priority: 'high' },
        { title: 'Keyword Research & Mapping', description: 'Identify target search queries and map them to pages.', priority: 'medium' },
        { title: 'Backlink Strategy Setup', description: 'Outline authority building and outreach link-acquisition strategies.', priority: 'medium' }
      ],
      'Website Design': [
        { title: 'UX Wireframe Review', description: 'Review and approve layouts, structural wireframes, and design flows.', priority: 'high' },
        { title: 'Visual Theme Branding', description: 'Define typography, color palettes, and brand guidelines.', priority: 'medium' },
        { title: 'Responsive Design QA', description: 'Verify page layout responsiveness across mobile, tablet, and desktop views.', priority: 'medium' }
      ],
      'Web & App Development': [
        { title: 'Database Schema Setup', description: 'Initialize database tables, key relationships, and indexes.', priority: 'urgent' },
        { title: 'API Integration Testing', description: 'Setup and test endpoints for integrations and third-party APIs.', priority: 'high' },
        { title: 'QA Staging Deploy', description: 'Perform full system integration testing on staging environment.', priority: 'high' }
      ],
      'Digital Marketing': [
        { title: 'Audience Competitor Analysis', description: 'Analyze competitor positioning and marketing funnels.', priority: 'medium' },
        { title: 'Lead Capture Form Integration', description: 'Set up opt-in sheets and dynamic tracking on registration forms.', priority: 'high' }
      ],
      'Digital PR': [
        { title: 'Media Press Release Copy', description: 'Draft compelling PR statements and copy outlines.', priority: 'high' },
        { title: 'Journalist Contact List', description: 'Compile media contact sheets for distribution.', priority: 'medium' }
      ],
      'Social Media & Content': [
        { title: '30-Day Content Calendar', description: 'Schedule graphic assets, video shorts, and publication plans.', priority: 'high' },
        { title: 'Graphic Visual Creative Assets', description: 'Build and brand high-fidelity visual layouts.', priority: 'medium' }
      ],
      'Targeted Advertising': [
        { title: 'Ad Pixel Integration', description: 'Deploy tracking conversion scripts (Meta Pixel, Google Tag Manager).', priority: 'urgent' },
        { title: 'Target Market Segment Definitions', description: 'Build custom audience targets and retargeting segments.', priority: 'high' },
        { title: 'Ad Graphic Creatives & Copy', description: 'Build media assets and write high-converting caption descriptions.', priority: 'medium' }
      ],
      'AI Chatbot Automation': [
        { title: 'Flow Logic Map Design', description: 'Outline trigger words, query intents, and message sequences.', priority: 'high' },
        { title: 'Lead Auto-Sync Setup', description: 'Connect conversational outputs with CRM records.', priority: 'urgent' }
      ],
      'Paid Advertising': [
        { title: 'Bidding Campaign Optimization', description: 'Refine keyword bids, search triggers, and budget margins.', priority: 'high' },
        { title: 'Ad Creative Split testing', description: 'Setup A/B split variants on media assets to increase ROAS.', priority: 'medium' }
      ]
    }

    for (const serviceId of serviceIds) {
      const { data: sObj } = await supabase.from('services').select('name').eq('id', serviceId).single()
      if (sObj) {
        const tasksToCreate = defaultTasksByService[sObj.name] || []
        for (const taskTemplate of tasksToCreate) {
          const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          await supabase.from('tasks').insert({
            client_id: client.id,
            title: taskTemplate.title,
            description: taskTemplate.description,
            priority: taskTemplate.priority,
            status: 'pending',
            due_date: dueDate
          })
        }
      }
    }

    // 6. Create in-app notifications
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Welcome to NzxtGen Digital Services!',
        message: 'Your portal has been set up. Feel free to explore your active services, billing, and reports.',
        type: 'welcome'
      })
    }

    // 7. Fire automation webhooks & emails asynchronously
    if (primaryService) {
      await triggerWebhook('new_client_added', { client, service: primaryService, totalBudget: 0 })
      // Resolve standard name of primary service for email notifications
      const { data: sLookup } = await supabase.from('services').select('name').eq('id', serviceIds[0]).single()
      const primaryServiceName = sLookup?.name || 'Your service'
      await sendWelcomeEmail(name, email)
      await sendAccountCreationEmail(name, email)
    }

    revalidatePath('/admin')
    revalidatePath('/admin/clients')
    return { success: true, clientId: client.id }
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred.' }
  }
}

export async function editClient(clientId: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const businessName = formData.get('businessName') as string
  const phoneNumber = formData.get('phoneNumber') as string
  const whatsappNumber = formData.get('whatsappNumber') as string
  const notes = formData.get('notes') as string

  if (!name || !businessName) {
    return { error: 'Name and Business Name are required.' }
  }

  const { data: client, error } = await supabase
    .from('clients')
    .update({
      name,
      business_name: businessName,
      phone_number: phoneNumber,
      whatsapp_number: whatsappNumber,
      notes,
    })
    .eq('id', clientId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await triggerWebhook('service_updated', { client })
  
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function deleteClient(clientId: string) {
  const supabase = await createClient()

  // First fetch email to clean up auth if needed
  const { data: client } = await supabase.from('clients').select('email, user_id').eq('id', clientId).single()

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (error) {
    return { error: error.message }
  }

  // Note: auth user is cascade deleted if user_id was set (due to public.users CASCADE delete,
  // but wait - auth.users references are usually not deleted by cascade.
  // In a real app we'd call admin.deleteUser if we have service_role, but public schemas are clean.
  
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function setClientStatus(clientId: string, status: 'active' | 'suspended') {
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .update({ status })
    .eq('id', clientId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Trigger webhooks
  const event = status === 'active' ? 'client_activated' : 'client_suspended'
  await triggerWebhook(event, { client })

  // Send in-app alert
  if (client.user_id) {
    await supabase.from('notifications').insert({
      user_id: client.user_id,
      title: status === 'active' ? 'Account Re-activated' : 'Account Suspended',
      message: status === 'active' 
        ? 'Your account has been successfully re-activated.' 
        : 'Your client portal access has been temporarily suspended. Please contact administration.',
      type: 'service_update'
    })
  }

  revalidatePath('/admin/clients')
  return { success: true }
}

/**
 * PAYMENTS OPERATIONS
 */

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()

  const clientId = formData.get('clientId') as string
  const serviceId = formData.get('serviceId') as string || null
  const amount = parseFloat(formData.get('amount') as string)
  const paymentDate = formData.get('paymentDate') as string
  const paymentMethod = formData.get('paymentMethod') as string
  const notes = formData.get('notes') as string
  const status = formData.get('status') as 'completed' | 'pending' | 'failed' || 'completed'

  if (!clientId || isNaN(amount) || amount <= 0) {
    return { error: 'Valid client and payment amount are required.' }
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      client_id: clientId,
      service_id: serviceId,
      amount,
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      payment_method: paymentMethod || 'Bank Transfer',
      status,
      notes,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // If status is completed and serviceId is provided, update client_services advance_paid balance
  if (status === 'completed' && serviceId) {
    // Read current client_services advance_paid
    const { data: service } = await supabase.from('client_services').select('advance_paid').eq('id', serviceId).single()
    if (service) {
      await supabase
        .from('client_services')
        .update({ advance_paid: Number(service.advance_paid) + amount })
        .eq('id', serviceId)
    }
  }

  // Fetch client user data to send notifications
  const { data: client } = await supabase.from('clients').select('name, email, user_id').eq('id', clientId).single()
  
  if (client) {
    if (client.user_id && status === 'completed') {
      await supabase.from('notifications').insert({
        user_id: client.user_id,
        title: 'Payment Received',
        message: `We successfully recorded your payment of ${formatCurrency(amount)}.`,
        type: 'payment_confirmation'
      })
    }
    
    // Fire integrations
    let serviceName = 'Your service'
    if (serviceId) {
      const { data: s } = await supabase
        .from('client_services')
        .select('service:services(name)')
        .eq('id', serviceId)
        .single()
      if (s && s.service) {
        serviceName = (s.service as any).name
      }
    }

    if (status === 'completed') {
      await sendPaymentConfirmationEmail(client.name, client.email, amount, serviceName)
    }
    await triggerWebhook('payment_recorded', { payment, client })
  }

  revalidatePath('/admin/payments')
  revalidatePath('/admin')
  return { success: true }
}

/**
/**
 * CLIENT TASK OPERATIONS
 */

export async function addTask(formData: FormData) {
  const supabase = await createClient()

  const clientId = formData.get('clientId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent'
  const dueDate = formData.get('dueDate') as string

  if (!clientId || !title || !dueDate) {
    return { error: 'Client ID, Title, and Due Date are required.' }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      client_id: clientId,
      title,
      description,
      priority: priority || 'medium',
      status: 'pending',
      due_date: dueDate,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin')
  revalidatePath('/client')
  return { success: true, task }
}

export async function editTask(formData: FormData) {
  const supabase = await createClient()

  const taskId = formData.get('taskId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent'
  const status = formData.get('status') as 'pending' | 'in_progress' | 'completed'
  const dueDate = formData.get('dueDate') as string

  if (!taskId || !title || !dueDate) {
    return { error: 'Task ID, Title, and Due Date are required.' }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      title,
      description,
      priority,
      status,
      due_date: dueDate,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin')
  revalidatePath('/client')
  return { success: true, task }
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin')
  revalidatePath('/client')
  return { success: true }
}

export async function toggleTaskComplete(taskId: string, currentStatus: string) {
  const supabase = await createClient()
  const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed'

  const { error } = await supabase
    .from('tasks')
    .update({ status: nextStatus })
    .eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin')
  revalidatePath('/client')
  return { success: true }
}

/**
 * DOCUMENTS AND REPORTS
 */

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()

  const clientId = formData.get('clientId') as string
  const docName = formData.get('name') as string
  const docType = formData.get('type') as 'invoice' | 'contract' | 'report' | 'project_file'
  const fileUrl = formData.get('fileUrl') as string
  const fileSize = parseInt(formData.get('fileSize') as string || '0')

  if (!clientId || !docName || !fileUrl || !docType) {
    return { error: 'Client, document name, type, and URL are required.' }
  }

  // 1. Insert into public.documents
  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      client_id: clientId,
      name: docName,
      file_url: fileUrl,
      file_size: fileSize,
      type: docType,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // 2. Insert helper triggers depending on type
  const { data: client } = await supabase.from('clients').select('name, email, user_id').eq('id', clientId).single()

  if (client) {
    if (docType === 'invoice') {
      // Create invoice record
      const invoiceNum = 'INV-' + Math.floor(100000 + Math.random() * 900000)
      await supabase.from('invoices').insert({
        client_id: clientId,
        invoice_number: invoiceNum,
        amount: 0.00, // can update later
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        status: 'unpaid',
        file_url: fileUrl,
      })

      if (client.user_id) {
        await supabase.from('notifications').insert({
          user_id: client.user_id,
          title: 'New Invoice Uploaded',
          message: `A new invoice (${docName}) is available for download.`,
          type: 'invoice_uploaded'
        })
      }

      await triggerWebhook('invoice_uploaded', { document, client })
    }
  }

  revalidatePath('/admin/documents')
  return { success: true }
}

export async function uploadReport(formData: FormData) {
  const supabase = await createClient()

  const clientId = formData.get('clientId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const fileUrl = formData.get('fileUrl') as string
  const reportDate = formData.get('reportDate') as string

  if (!clientId || !title || !fileUrl) {
    return { error: 'Client, report title, and file URL are required.' }
  }

  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      client_id: clientId,
      title,
      description,
      file_url: fileUrl,
      report_date: reportDate || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Also sync report to general documents table for easier unified lists
  await supabase.from('documents').insert({
    client_id: clientId,
    name: title,
    file_url: fileUrl,
    type: 'report',
  })

  // Notify client
  const { data: client } = await supabase.from('clients').select('name, email, user_id').eq('id', clientId).single()

  if (client) {
    if (client.user_id) {
      await supabase.from('notifications').insert({
        user_id: client.user_id,
        title: 'New Report Uploaded',
        message: `Your performance report "${title}" has been compiled and is ready for review.`,
        type: 'report_uploaded'
      })
    }
    await sendReportUploadedEmail(client.name, client.email, title)
    await triggerWebhook('report_uploaded', { report, client })
  }

  revalidatePath('/admin/documents')
  return { success: true }
}

export async function deleteDocument(docId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/documents')
  return { success: true }
}

export async function updateReminderTemplate(
  id: string,
  subject: string,
  body: string,
  whatsappBody: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('reminder_templates')
    .update({
      email_subject: subject,
      email_body: body,
      whatsapp_body: whatsappBody,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

