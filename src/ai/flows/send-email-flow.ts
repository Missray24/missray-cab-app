
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
const ADMIN_NAME = 'Admin missray cab';

const getEmailContent = (type: EmailType, params: Record<string, any> = {}) => {
  switch (type) {
    case 'new_client_welcome':
      return {
        subject: 'Bienvenue chez missray cab !',
        htmlContent: `
          <h1>Bonjour ${params.clientName},</h1>
          <p>Nous sommes ravis de vous accueillir sur notre plateforme. Vous pouvez dès maintenant réserver votre chauffeur.</p>
          <p>L'équipe missray cab</p>
        `,
        textContent: `Bonjour ${params.clientName},\nNous sommes ravis de vous accueillir sur notre plateforme. Vous pouvez dès maintenant réserver votre chauffeur.\nL'équipe missray cab`,
      };
    case 'new_driver_welcome':
      return {
        subject: 'Bienvenue dans la flotte missray cab !',
        htmlContent: `
          <h1>Bonjour ${params.driverName},</h1>
          <p>Votre inscription est terminée ! Nous sommes heureux de vous compter parmi nos chauffeurs partenaires.</p>
          <p>L'équipe missray cab</p>
        `,
        textContent: `Bonjour ${params.driverName},\nVotre inscription est terminée ! Nous sommes heureux de vous compter parmi nos chauffeurs partenaires.\nL'équipe missray cab`,
      };
    case 'admin_new_user':
      return {
        subject: `Nouvel utilisateur inscrit : ${params.userType}`,
        htmlContent: `
          <h1>Un nouvel utilisateur vient de s'inscrire.</h1>
          <p><strong>Type:</strong> ${params.userType}</p>
          <p><strong>Nom:</strong> ${params.name}</p>
          <p><strong>Email:</strong> ${params.email}</p>
        `,
        textContent: `Un nouvel utilisateur vient de s'inscrire.\nType: ${params.userType}\nNom: ${params.name}\nEmail: ${params.email}`,
      };
    default:
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
      return { success: false };
    }
    
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

    let to = input.to;
    let contentParams = input.params || {};

    if (input.type === 'admin_new_user') {
      to = { email: ADMIN_EMAIL, name: ADMIN_NAME };
    }
    
    const { subject, htmlContent } = getEmailContent(input.type, contentParams);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: ADMIN_NAME, email: ADMIN_EMAIL };
    sendSmtpEmail.to = [{ email: to.email, name: to.name }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    try {
      const { body } = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Brevo API sent email successfully. Message ID: ' + (body.messageId || 'N/A'));
      return { success: true, messageId: body.messageId };
    } catch (error: any) {
      console.error('Error sending email via Brevo API:', error.message);
      return { success: false };
    }
  }
);
