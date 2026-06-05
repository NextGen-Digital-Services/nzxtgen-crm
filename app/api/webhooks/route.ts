import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDueReminderEmail } from '@/services/email'
import { sendWhatsAppNotification } from '@/services/whatsapp'

/**
 * Make.com and external integration webhook receiver
 * POST /api/webhooks
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event, data } = body

    if (!event) {
      return NextResponse.json({ error: 'Missing event field' }, { status: 400 })
    }

    const supabase = await createClient()

    // Log the incoming webhook execution
    await supabase.from('webhook_logs').insert({
      event_type: `incoming_${event}`,
      payload: body,
      response_status: 200,
      response_body: 'Processed successfully',
    })

    switch (event) {
      case 'due_date_reminder': {
        // Trigger a due date reminder for a client
        const { clientId, amount, dueDate, serviceName } = data
        if (!clientId || !amount || !dueDate || !serviceName) {
          return NextResponse.json({ error: 'Missing parameter details for due date reminder' }, { status: 400 })
        }

        // Fetch client details
        const { data: client } = await supabase
          .from('clients')
          .select('name, email, whatsapp_number')
          .eq('id', clientId)
          .single()

        if (!client) {
          return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // 1. Send Email via Brevo
        await sendDueReminderEmail(client.name, client.email, parseFloat(amount), dueDate, serviceName)

        // 2. Send WhatsApp notification mapping templates
        if (client.whatsapp_number) {
          await sendWhatsAppNotification({
            to: client.whatsapp_number,
            templateName: 'payment_reminder',
            parameters: {
              name: client.name,
              amount: `₹${parseFloat(amount).toLocaleString('en-IN')}`,
              due_date: dueDate,
              service_name: serviceName,
              portal_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/client/payments`,
            },
          })
        }

        // 3. Create In-App Notification
        const { data: clientUser } = await supabase
          .from('clients')
          .select('user_id')
          .eq('id', clientId)
          .single()

        if (clientUser?.user_id) {
          await supabase.from('notifications').insert({
            user_id: clientUser.user_id,
            title: 'Payment Reminder',
            message: `A payment of ₹${parseFloat(amount).toLocaleString('en-IN')} is due on ${dueDate} for ${serviceName}.`,
            type: 'payment_reminder',
          })
        }

        return NextResponse.json({ success: true, message: 'Due date reminder sent.' })
      }

      case 'client_activation': {
        const { clientId } = data
        if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

        const { error } = await supabase.from('clients').update({ status: 'active' }).eq('id', clientId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true, message: 'Client activated.' })
      }

      case 'client_suspension': {
        const { clientId } = data
        if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

        const { error } = await supabase.from('clients').update({ status: 'suspended' }).eq('id', clientId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true, message: 'Client suspended.' })
      }

      default:
        return NextResponse.json({ message: `Event ${event} received but has no specific action.` })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error processing webhook' }, { status: 500 })
  }
}
