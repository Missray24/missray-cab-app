
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
  const clientWelcomeHtml = `
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; border: 1px solid #cccccc; border-radius: 8px; overflow: hidden;">
          <tr>
              <td align="center" bgcolor="#223aff" style="padding: 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                  MISSRAY CAB
              </td>
          </tr>
          <tr>
              <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                  <h1 style="color: #333333;">Bienvenue, ${params.clientName || 'cher client'} !</h1>
                  <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                      Nous sommes ravis de vous accueillir. Votre compte a été créé avec succès. Vous pouvez dès maintenant réserver des courses pour tous vos déplacements.
                  </p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="https://missray-cab.com/my-bookings" target="_blank" style="background: linear-gradient(to right, #223aff, #006df1); color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 5px; display: inline-block; font-weight: bold;">Voir mes réservations</a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                      Merci de votre confiance.
                  </p>
                  <p style="color: #555555; font-size: 16px; line-height: 1.5;">L'équipe missray cab</p>
              </td>
          </tr>
          <tr>
            <td bgcolor="#eeeeee" style="padding: 20px 30px; text-align: center; color: #888888; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} missray cab. Tous droits réservés.</p>
            </td>
          </tr>
      </table>
    </body>`;

  const driverWelcomeHtml = `
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; border: 1px solid #cccccc; border-radius: 8px; overflow: hidden;">
          <tr>
              <td align="center" bgcolor="#223aff" style="padding: 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                  MISSRAY CAB
              </td>
          </tr>
          <tr>
              <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                  <h1 style="color: #333333;">Bienvenue dans la flotte, ${params.driverName || 'cher chauffeur'} !</h1>
                  <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                      Félicitations, votre inscription est terminée ! Vous faites désormais partie de notre réseau de chauffeurs professionnels.
                  </p>
                   <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                      Connectez-vous à votre tableau de bord pour gérer vos informations et consulter vos documents.
                  </p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="https://missray-cab.com/login" target="_blank" style="background: linear-gradient(to right, #223aff, #006df1); color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 5px; display: inline-block; font-weight: bold;">Accéder à mon espace</a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                      Nous sommes impatients de collaborer avec vous.
                  </p>
                  <p style="color: #555555; font-size: 16px; line-height: 1.5;">L'équipe missray cab</p>
              </td>
          </tr>
          <tr>
            <td bgcolor="#eeeeee" style="padding: 20px 30px; text-align: center; color: #888888; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} missray cab. Tous droits réservés.</p>
            </td>
          </tr>
      </table>
    </body>`;


  switch (type) {
    case 'new_client_welcome':
      return {
        subject: 'Bienvenue chez missray cab !',
        html: clientWelcomeHtml,
      };
    case 'new_driver_welcome':
      return {
        subject: 'Bienvenue dans la flotte missray cab !',
        html: driverWelcomeHtml,
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
