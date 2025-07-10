
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

// IMPORTANT: This email must be a valid sender address on your IONOS account.
const SENDER_EMAIL = 'contact@missray-cab.com';
const SENDER_NAME = 'missray cab';
const ADMIN_EMAIL = 'contact@missray-cab.com';

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
    case 'admin_new_user':
      return {
        subject: `Nouvel utilisateur inscrit: ${params.userType}`,
        html: `
          <h1>Un nouvel utilisateur s'est inscrit</h1>
          <ul>
            <li><strong>Type:</strong> ${params.userType}</li>
            <li><strong>Nom:</strong> ${params.name}</li>
            <li><strong>Email:</strong> ${params.email}</li>
          </ul>
        `,
      };
    default:
      throw new Error('Invalid email type');
  }
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

    const { subject, html } = getEmailContent(input.type, input.params);
    
    // For admin notifications, the recipient is always the admin.
    const recipientEmail = input.type === 'admin_new_user' ? ADMIN_EMAIL : input.to.email;
    const recipientName = input.type === 'admin_new_user' ? 'Admin' : input.to.name;

    const mailOptions = {
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: `"${recipientName}" <${recipientEmail}>`,
      subject: subject,
      html: html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Nodemailer sent email successfully. Message ID: ' + info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('Error sending email via Nodemailer:', error);
      return { success: false };
    }
  }
);
