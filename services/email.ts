import axios from 'axios'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'info@nzxtgen.com'
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'NzxtGen Digital Services'

interface EmailRecipient {
  email: string
  name: string
}

async function sendEmail({
  to,
  subject,
  htmlContent,
  params,
  templateId,
}: {
  to: EmailRecipient[]
  subject?: string
  htmlContent?: string
  params?: Record<string, any>
  templateId?: number
}) {
  if (!BREVO_API_KEY) {
    console.log(`[Email Mock] To: ${to.map((t) => t.email).join(', ')}, Subject: ${subject || `Template #${templateId}`}`)
    console.log('[Email Mock] Body snippet:', htmlContent ? htmlContent.substring(0, 150) : `Template variables: ${JSON.stringify(params)}`)
    return { success: true, message: 'Mock sent. Configure BREVO_API_KEY to send live.' }
  }

  try {
    const data: Record<string, any> = {
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to,
    }

    if (templateId) {
      data.templateId = templateId
      if (params) data.params = params
    } else {
      data.subject = subject
      data.htmlContent = htmlContent
    }

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      data,
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log(`[Brevo Email] Sent successfully. MessageId: ${response.data.messageId}`)
    return { success: true, messageId: response.data.messageId }
  } catch (error: any) {
    console.error('[Brevo Email] Send error:', error.response?.data || error.message)
    return { success: false, error: error.response?.data || error.message }
  }
}

export async function sendWelcomeEmail(clientName: string, clientEmail: string) {
  return sendEmail({
    to: [{ email: clientEmail, name: clientName }],
    subject: 'Welcome to NzxtGen Digital Services client portal!',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #D4AF37; text-align: center;">Welcome to NzxtGen</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>Welcome to NzxtGen Digital Services! We are excited to work with you on growing your business and "Turning Clicks Into Customers".</p>
        <p>Your client portal account is ready. You can log in using your email to view your purchased services, active payments, ad spend status, and reports.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; border: 1px solid #D4AF37;">Log In to Portal</a>
        </div>
        <p>Best regards,<br/><strong>NzxtGen Team</strong></p>
      </div>
    `,
  })
}

export async function sendAccountCreationEmail(clientName: string, clientEmail: string) {
  return sendEmail({
    to: [{ email: clientEmail, name: clientName }],
    subject: 'Account Created - NzxtGen Client Portal',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #D4AF37;">Account Configured</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>Your portal profile has been successfully configured. You will receive an invitation email to set your secure password shortly, or you can use the "Forgot Password" link on the login screen.</p>
        <p>Portal login URL: <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login">${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login</a></p>
        <p>Best regards,<br/>NzxtGen Team</p>
      </div>
    `,
  })
}

export async function sendLoginCredentialsEmail(clientName: string, clientEmail: string, passwordResetLink: string) {
  return sendEmail({
    to: [{ email: clientEmail, name: clientName }],
    subject: 'Set Your Login Credentials - NzxtGen Client Portal',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #D4AF37;">Setup Your Password</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>Your client portal account has been provisioned. Please set your credentials to access your dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${passwordResetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; border: 1px solid #D4AF37;">Set Password & Log In</a>
        </div>
        <p>If the button doesn't work, copy and paste this link in your browser:</p>
        <p style="word-break: break-all;"><a href="${passwordResetLink}">${passwordResetLink}</a></p>
        <p>Best regards,<br/>NzxtGen Team</p>
      </div>
    `,
  })
}

export async function sendPaymentConfirmationEmail(
  clientName: string,
  clientEmail: string,
  amount: number,
  serviceName: string
) {
  return sendEmail({
    to: [{ email: clientEmail, name: clientName }],
    subject: 'Payment Confirmation - NzxtGen Digital Services',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Payment Received</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>We have successfully processed your payment of <strong>$${amount.toFixed(2)}</strong> for the service: <strong>${serviceName}</strong>.</p>
        <p>You can review your complete transaction ledger, download matching invoices, and check remaining balances inside the client portal.</p>
        <p>Thank you for choosing NzxtGen Digital Services!</p>
        <p>Best regards,<br/>NzxtGen Team</p>
      </div>
    `,
  })
}

export async function sendDueReminderEmail(
  clientName: string,
  clientEmail: string,
  amount: number,
  dueDate: string,
  serviceName: string
) {
  return sendEmail({
    to: [{ email: clientEmail, name: clientName }],
    subject: `Payment Reminder: $${amount.toFixed(2)} due for ${serviceName}`,
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #FF9800;">Upcoming Payment Due</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>This is a friendly reminder that a payment of <strong>$${amount.toFixed(2)}</strong> is due on <strong>${dueDate}</strong> for: <strong>${serviceName}</strong>.</p>
        <p>Please log in to your portal to review and complete this transaction to ensure uninterrupted service.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/client/payments" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; border: 1px solid #D4AF37;">View Payment Details</a>
        </div>
        <p>Best regards,<br/>NzxtGen Team</p>
      </div>
    `,
  })
}

export async function sendReportUploadedEmail(clientName: string, clientEmail: string, reportTitle: string) {
  return sendEmail({
    to: [{ email: clientEmail, name: clientName }],
    subject: `New Report Uploaded: ${reportTitle}`,
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #D4AF37;">New Report Available</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>A new performance report has been compiled and uploaded to your dashboard: <strong>${reportTitle}</strong>.</p>
        <p>Log in to download or review your latest analytics and contract files.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/client/documents" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; border: 1px solid #D4AF37;">Download Report</a>
        </div>
        <p>Best regards,<br/>NzxtGen Team</p>
      </div>
    `,
  })
}
