// WhatsApp Cloud API Ready Architecture Support
// Prepared for future template storage, webhook delivery logs, and notification configurations

export interface WhatsAppTemplate {
  name: string
  language: string
  components: any[]
}

/**
 * Sends a mocked WhatsApp message.
 * This sets up the architecture to query client numbers, map templates,
 * and perform the fetch request when the WhatsApp API is active.
 */
export async function sendWhatsAppNotification({
  to,
  templateName,
  parameters,
}: {
  to: string
  templateName: string
  parameters: Record<string, string>
}) {
  console.log(`[WhatsApp Architecture] Triggered for: ${to}`)
  console.log(`[WhatsApp Architecture] Template: ${templateName}`)
  console.log(`[WhatsApp Architecture] Mapped parameters:`, parameters)

  // In the future, this function will execute a POST request to:
  // https://graph.facebook.com/v20.0/{{PHONE_NUMBER_ID}}/messages
  //
  // Body example:
  // {
  //   "messaging_product": "whatsapp",
  //   "recipient_type": "individual",
  //   "to": to,
  //   "type": "template",
  //   "template": {
  //     "name": templateName,
  //     "language": {
  //       "code": "en_US"
  //     },
  //     "components": [
  //       {
  //         "type": "body",
  //         "parameters": Object.keys(parameters).map(key => ({
  //           "type": "text",
  //           "text": parameters[key]
  //         }))
  //       }
  //     ]
  //   }
  // }

  return {
    success: true,
    messageId: `wa_mock_${Math.random().toString(36).substring(2, 15)}`,
    status: 'sent_to_gateway',
  }
}

/**
 * Triggered on incoming webhook from WhatsApp to track Delivery / Read receipts.
 */
export async function handleWhatsAppDeliveryStatus(webhookBody: any) {
  // Extract message status, message ID, timestamp, and errors from webhookBody
  // Update status in the database matching delivery tracker logs
  console.log('[WhatsApp Architecture] Delivery receipt parsed:', webhookBody)
}
