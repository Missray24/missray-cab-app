
'use server';
/**
 * @fileOverview A flow for sending transactional emails via an SMTP server using Nodemailer.
 * - sendEmail - A function that handles sending different types of emails.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { IONOS_SMTP_HOST, IONOS_SMTP_PORT, IONOS_SMTP_USER, IONOS_SMTP_PASS } from '@/lib/config';

const EmailTypeSchema = z.enum(['new_client_welcome', 'new_driver_welcome']);
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

// IMPORTANT: This email must be a valid sender address on your IONOS account.
const SENDER_EMAIL = 'contact@missray-cab.com';
const SENDER_NAME = 'MISSRAY CAB';
const ADMIN_EMAIL = 'contact@missray-cab.com';

if (!IONOS_SMTP_HOST || !IONOS_SMTP_USER || !IONOS_SMTP_PASS) {
  console.warn('IONOS SMTP configuration is incomplete. Email functionality will be disabled.');
}

const transporter = nodemailer.createTransport({
  host: IONOS_SMTP_HOST,
  port: IONOS_SMTP_PORT ? parseInt(IONOS_SMTP_PORT, 10) : 587,
  secure: IONOS_SMTP_PORT ? parseInt(IONOS_SMTP_PORT, 10) === 465 : false, // true for 465, false for other ports
  auth: {
    user: IONOS_SMTP_USER,
    pass: IONOS_SMTP_PASS,
  },
});

const getEmailContent = (type: EmailType, params: Record<string, any> = {}) => {
  switch (type) {
    case 'new_client_welcome':
      return {
        subject: 'Bienvenue chez missray cab !',
        html: `
          <h1>Bonjour ${params.clientName || 'cher client'},</h1>
          <p>Nous sommes ravis de vous compter parmi nous. Vous pouvez dès maintenant réserver vos courses.</p>
          <p>L'équipe missray cab</p>
        `,
      };
    case 'new_driver_welcome':
      return {
        subject: 'Bienvenue dans la flotte missray cab !',
        html: `
          <h1>Bonjour ${params.driverName || 'cher chauffeur'},</h1>
          <p>Votre inscription est confirmée. Vous pouvez commencer à recevoir des courses via notre plateforme.</p>
          <p>L'équipe missray cab</p>
        `,
      };
    default:
      throw new Error('Invalid email type');
  }
};

const getAdminNotificationContent = (userType: 'Client' | 'Chauffeur', params: Record<string, any> = {}) => {
    return {
        subject: `Nouvel utilisateur inscrit: ${userType}`,
        html: `
          <h1>Un nouvel utilisateur s'est inscrit</h1>
          <ul>
            <li><strong>Type:</strong> ${userType}</li>
            <li><strong>Nom:</strong> ${params.name}</li>
            <li><strong>Email:</strong> ${params.email}</li>
          </ul>
        `,
    };
};

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
    if (!IONOS_SMTP_HOST || !IONOS_SMTP_USER || !IONOS_SMTP_PASS) {
      console.error('IONOS SMTP configuration is incomplete. Email not sent.');
      return { success: false };
    }

    // 1. Send welcome email to the user
    const userEmailContent = getEmailContent(input.type, input.params);
    const userMailOptions = {
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: `"${input.to.name}" <${input.to.email}>`,
      subject: userEmailContent.subject,
      html: userEmailContent.html,
    };
    
    let userEmailSuccess = false;
    let finalMessageId: string | undefined;

    try {
      const info = await transporter.sendMail(userMailOptions);
      console.log(`Nodemailer sent welcome email to ${input.to.email}. Message ID: ${info.messageId}`);
      userEmailSuccess = true;
      finalMessageId = info.messageId;
    } catch (error: any) {
      console.error(`Error sending welcome email to ${input.to.email}:`, error);
      // We don't return here, so we still attempt to send the admin email.
    }
    
    // 2. Send notification email to the admin
    const userType = input.type === 'new_client_welcome' ? 'Client' : 'Chauffeur';
    const adminEmailContent = getAdminNotificationContent(userType, { name: input.to.name, email: input.to.email });
    const adminMailOptions = {
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to: `"${'Admin'}" <${ADMIN_EMAIL}>`,
        subject: adminEmailContent.subject,
        html: adminEmailContent.html,
    };

    try {
        const info = await transporter.sendMail(adminMailOptions);
        console.log(`Nodemailer sent admin notification. Message ID: ${info.messageId}`);
    } catch (error: any) {
        console.error('Error sending admin notification email:', error);
        // If the user email failed, this will also result in a failure.
        if (!userEmailSuccess) {
            return { success: false };
        }
    }
    
    // Return success if at least the user email was sent.
    return { success: userEmailSuccess, messageId: finalMessageId };
  }
);
