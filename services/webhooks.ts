import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

// Define the supported webhook events
export type WebhookEvent =
  | 'new_client_added'
  | 'payment_recorded'
  | 'invoice_uploaded'
  | 'report_uploaded'
  | 'service_updated'
  | 'due_date_reminder'
  | 'client_activated'
  | 'client_suspended';

export async function triggerWebhook(event: WebhookEvent, payload: any) {
  const supabase = await createClient()
  const webhookUrl = process.env.MAKE_WEBHOOK_URL

  console.log(`[Webhook] Event: ${event} triggered.`)

  let responseStatus = null
  let responseBody = ''

  if (webhookUrl) {
    try {
      const response = await axios.post(webhookUrl, {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      })

      responseStatus = response.status
      responseBody = JSON.stringify(response.data)
      console.log(`[Webhook] Sent successfully: status ${responseStatus}`)
    } catch (error: any) {
      console.error('[Webhook] Failed to send:', error.message)
      responseStatus = error.response?.status || 500
      responseBody = error.response?.data ? JSON.stringify(error.response.data) : error.message
    }
  } else {
    console.log('[Webhook] MAKE_WEBHOOK_URL not configured. Webhook logged locally only.')
    responseBody = 'MAKE_WEBHOOK_URL not configured. Logged locally.'
  }

  // Record webhook trigger in the database
  try {
    const { error } = await supabase.from('webhook_logs').insert({
      event_type: event,
      payload,
      response_status: responseStatus,
      response_body: responseBody,
    })

    if (error) {
      console.error('[Webhook Log] Error saving to db:', error.message)
    }
  } catch (dbError) {
    console.error('[Webhook Log] DB write error:', dbError)
  }
}
