
'use server';
/**
 * @fileOverview A flow for sending transactional emails via Brevo API.
 * - sendEmail - A function that handles sending different types of emails.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as brevo from '@getbrevo/brevo';
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
const ADMIN_NAME = 'Admin missray cab';

// Configure Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY || '');


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
    // Ensure the Brevo API key is set in the environment variables.
    if (!BREVO_API_KEY) {
      console.error('Brevo API key is not configured. Email not sent.');
      return { success: false };
    }

    let templateId: number | undefined;
    const to = [input.to];

    switch (input.type) {
      case 'new_client_welcome':
        templateId = 1; // Welcome to new client
        break;
      case 'new_driver_welcome':
        templateId = 2; // Welcome to new driver
        break;
      case 'admin_new_user':
        templateId = 3; // New user notification for admin
        // Override recipient to be the admin
        to[0] = { email: ADMIN_EMAIL, name: ADMIN_NAME };
        break;
      default:
        throw new Error('Invalid email type');
    }
    
    if (!templateId) {
        console.error(`No template configured for email type: ${input.type}`);
        return { success: false };
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.templateId = templateId;
    sendSmtpEmail.to = to;
    sendSmtpEmail.sender = { email: ADMIN_EMAIL, name: 'missray cab' };
    sendSmtpEmail.params = input.params;

    try {
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Brevo API called successfully. Returned data: ' + JSON.stringify(data.body));
      return { success: true, messageId: data.body.messageId };
    } catch (error: any) {
      // Log the detailed error from Brevo API for better debugging
      console.error('Error sending email via Brevo:', error.body?.message || error.message || error);
      return { success: false };
    }
  }
);
