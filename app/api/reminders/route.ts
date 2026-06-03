import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerWebhook } from '@/services/webhooks'

/**
 * Daily scheduler endpoint to audit upcoming dues and send alerts
 * GET /api/reminders
 */
export async function GET(request: Request) {
  // Simple auth check via header to prevent unauthorized runs in production
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // 1. Audit invoices due in the next 3 days that are 'unpaid'
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const targetDateStr = threeDaysFromNow.toISOString().split('T')[0]

    // Fetch invoices due on or before target date
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('status', 'unpaid')
      .lte('due_date', targetDateStr)

    if (invoicesError) {
      return NextResponse.json({ error: invoicesError.message }, { status: 500 })
    }

    let processedCount = 0

    // 2. Dispatch reminder webhooks for each due invoice
    for (const invoice of invoices) {
      const client = invoice.clients
      if (!client) continue

      // Fire due date reminder webhook to process email & messaging alerts
      await triggerWebhook('due_date_reminder', {
        clientId: client.id,
        amount: invoice.amount,
        dueDate: invoice.due_date,
        serviceName: `Invoice #${invoice.invoice_number}`,
      })

      processedCount++
    }

    return NextResponse.json({
      success: true,
      scanned_until: targetDateStr,
      reminders_sent: processedCount,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error executing cron' }, { status: 500 })
  }
}
