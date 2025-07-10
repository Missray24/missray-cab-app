
'use server';
/**
 * @fileOverview A flow for sending transactional emails via the Brevo API.
 * - sendEmail - A function that handles sending different types of emails.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as Brevo from '@getbrevo/brevo';
import { BREVO_API_KEY } from '@/lib/config';

const EmailTypeSchema = z.enum(['new_client_welcome', 'new_driver_welcome', 'admin_new_user']);
export type EmailType = z.infer<typeof EmailTypeSchema>;

const SendEmailInputSchema = z.object({
  type: EmailTypeSchema,
  to: z.object({
    email: z.string().email(),
    name: z.string(),
  }),
  params: z.record(z.any()).optional(),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

// IMPORTANT: This email must be a validated sender in your Brevo account.
const ADMIN_EMAIL = 'contact@missray-cab.com';
const ADMIN_NAME = 'missray cab';

const getTemplateIdForType = (type: EmailType): number => {
    switch (type) {
        case 'new_client_welcome':
            return 7; // Welcome email for new clients
        case 'new_driver_welcome':
            return 8; // Welcome email for new drivers
        case 'admin_new_user':
            return 9; // Notification for admin about a new user
        default:
            // This case should not be reachable due to Zod validation
            throw new Error('Invalid email type');
    }
}

export async function sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({ success: z.boolean(), messageId: z.string().optional() }),
  },
  async (input) => {
    if (!BREVO_API_KEY) {
      console.error('Brevo API key is not configured. Email not sent. Please set it in your .env file.');
      // Return success: false but don't throw, so the user flow is not interrupted.
      return { success: false };
    }
    
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    // Common properties for all emails
    sendSmtpEmail.templateId = getTemplateIdForType(input.type);
    sendSmtpEmail.params = input.params;
    
    // The sender must be a validated sender in your Brevo account.
    sendSmtpEmail.sender = { email: ADMIN_EMAIL, name: ADMIN_NAME };

    // Set recipient based on email type. The 'to' property must be an array.
    if (input.type === 'admin_new_user') {
      sendSmtpEmail.to = [{ email: ADMIN_EMAIL, name: ADMIN_NAME }];
    } else {
      sendSmtpEmail.to = [input.to];
    }
    
    try {
      const { body } = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Brevo API sent email successfully. Message ID: ' + (body.messageId || 'N/A'));
      return { success: true, messageId: body.messageId };
    } catch (error: any) {
      // The Brevo API client might throw errors with a 'body' property containing details.
      console.error('Error sending email via Brevo API:', error.body || error.message);
      return { success: false };
    }
  }
);
