
'use server';
/**
 * @fileOverview A flow for sending transactional emails via Brevo SMTP.
 * - sendEmail - A function that handles sending different types of emails.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER, BREVO_SMTP_PASS } from '@/lib/config';

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
        html: `
          <h1>Bonjour ${params.clientName},</h1>
          <p>Nous sommes ravis de vous accueillir sur notre plateforme. Vous pouvez dès maintenant réserver votre chauffeur.</p>
          <p>L'équipe missray cab</p>
        `,
      };
    case 'new_driver_welcome':
      return {
        subject: 'Bienvenue dans la flotte missray cab !',
        html: `
          <h1>Bonjour ${params.driverName},</h1>
          <p>Votre inscription est terminée ! Nous sommes heureux de vous compter parmi nos chauffeurs partenaires.</p>
          <p>L'équipe missray cab</p>
        `,
      };
    case 'admin_new_user':
      return {
        subject: `Nouvel utilisateur inscrit : ${params.userType}`,
        html: `
          <h1>Un nouvel utilisateur vient de s'inscrire.</h1>
          <p><strong>Type:</strong> ${params.userType}</p>
          <p><strong>Nom:</strong> ${params.name}</p>
          <p><strong>Email:</strong> ${params.email}</p>
        `,
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
    // Ensure the Brevo SMTP credentials are set in the environment variables.
    if (!BREVO_SMTP_HOST || !BREVO_SMTP_PORT || !BREVO_SMTP_USER || !BREVO_SMTP_PASS) {
      console.error('Brevo SMTP credentials are not configured. Email not sent. Please set them in your .env file.');
      return { success: false };
    }
    
    // Initialize the Nodemailer transporter inside the flow
    const transporter = nodemailer.createTransport({
      host: BREVO_SMTP_HOST,
      port: Number(BREVO_SMTP_PORT),
      secure: Number(BREVO_SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: BREVO_SMTP_USER,
        pass: BREVO_SMTP_PASS,
      },
    });

    let to = input.to;
    let contentParams = input.params || {};

    if (input.type === 'admin_new_user') {
      to = { email: ADMIN_EMAIL, name: ADMIN_NAME };
    }
    
    const { subject, html } = getEmailContent(input.type, contentParams);

    const mailOptions = {
      from: `"${ADMIN_NAME}" <${ADMIN_EMAIL}>`, // sender address
      to: `"${to.name}" <${to.email}>`, // list of receivers
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
