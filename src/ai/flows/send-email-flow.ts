
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

const EmailTypeSchema = z.enum(['new_client_welcome', 'new_driver_welcome', 'new_reservation_client', 'reservation_cancelled_client', 'reservation_cancelled_admin']);
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
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; border: 1px solid #cccccc; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
          <tr>
              <td align="center" bgcolor="#223aff" style="padding: 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                  MISSRAY CAB
              </td>
          </tr>
          <tr>
              <td style="padding: 40px 30px 40px 30px;">
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
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; border: 1px solid #cccccc; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
          <tr>
              <td align="center" bgcolor="#223aff" style="padding: 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                  MISSRAY CAB
              </td>
          </tr>
          <tr>
              <td style="padding: 40px 30px 40px 30px;">
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
    
  const reservationConfirmationHtml = `
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; border: 1px solid #cccccc; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <tr>
          <td align="center" bgcolor="#223aff" style="padding: 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
            MISSRAY CAB
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <h1 style="color: #333333;">Confirmation de votre réservation</h1>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
              Bonjour ${params.clientName || ''},<br>
              Votre réservation a bien été enregistrée. Voici les détails :
            </p>
            <table border="0" cellpadding="10" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="color: #555555; font-size: 16px; width: 150px;">Date et heure :</td>
                <td style="color: #333333; font-size: 16px; font-weight: bold;">${params.date || ''}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="color: #555555; font-size: 16px;">Départ :</td>
                <td style="color: #333333; font-size: 16px; font-weight: bold;">${params.pickup || ''}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="color: #555555; font-size: 16px;">Arrivée :</td>
                <td style="color: #333333; font-size: 16px; font-weight: bold;">${params.dropoff || ''}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="color: #555555; font-size: 16px;">Gamme :</td>
                <td style="color: #333333; font-size: 16px; font-weight: bold;">${params.tierName || 'N/A'} (${params.passengers || 'N/A'} passagers, ${params.suitcases || 'N/A'} valises)</td>
              </tr>
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="color: #555555; font-size: 16px;">Paiement :</td>
                <td style="color: #333333; font-size: 16px; font-weight: bold;">${params.paymentMethod || 'N/A'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="color: #555555; font-size: 16px;">Montant total :</td>
                <td style="color: #333333; font-size: 16px; font-weight: bold;">${params.amount ? `${params.amount.toFixed(2)}€` : 'N/A'}</td>
              </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding: 20px 0 30px 0;">
                  <a href="https://missray-cab.com/my-bookings" target="_blank" style="background: linear-gradient(to right, #223aff, #006df1); color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 5px; display: inline-block; font-weight: bold;">Voir mes réservations</a>
                </td>
              </tr>
            </table>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
              Nous vous notifierons dès qu'un chauffeur aura accepté votre course.
            </p>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
              Merci d'avoir choisi missray cab.
            </p>
          </td>
        </tr>
        <tr>
          <td bgcolor="#eeeeee" style="padding: 20px 30px; text-align: center; color: #888888; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} missray cab. Tous droits réservés.</p>
          </td>
        </tr>
      </table>
    </body>`;

  const cancellationClientHtml = `
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; border: 1px solid #cccccc; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <tr>
          <td align="center" bgcolor="#ff4b5c" style="padding: 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
            MISSRAY CAB
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <h1 style="color: #333333;">Annulation de votre réservation</h1>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
              Bonjour ${params.clientName || ''},<br>
              Nous vous confirmons l'annulation de votre réservation n°${params.reservationId || ''}.
            </p>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
              <strong>Statut de l'annulation :</strong> ${params.status || 'Annulée'}
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding: 20px 0 30px 0;">
                  <a href="https://missray-cab.com/my-bookings" target="_blank" style="background: linear-gradient(to right, #223aff, #006df1); color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 5px; display: inline-block; font-weight: bold;">Voir mes réservations</a>
                </td>
              </tr>
            </table>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
              Nous restons à votre disposition si vous souhaitez planifier une autre course.
            </p>
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
    case 'new_reservation_client':
      return {
        subject: `Confirmation de votre réservation n°${params.reservationId || ''}`,
        html: reservationConfirmationHtml,
      };
    case 'reservation_cancelled_client':
        return {
            subject: `Annulation de votre réservation n°${params.reservationId || ''}`,
            html: cancellationClientHtml,
        };
    default:
      throw new Error('Invalid email type');
  }
};

const getAdminUserNotificationContent = (userType: 'Client' | 'Chauffeur', params: Record<string, any> = {}) => {
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

const getAdminReservationNotificationContent = (params: Record<string, any> = {}) => {
    return {
        subject: `Nouvelle réservation reçue (n°${params.reservationId || ''})`,
        html: `
          <h1>Nouvelle réservation</h1>
          <p>Une nouvelle course vient d'être réservée sur la plateforme.</p>
          <h2>Détails:</h2>
          <ul>
            <li><strong>Client:</strong> ${params.clientName || 'N/A'}</li>
            <li><strong>Date:</strong> ${params.date || 'N/A'}</li>
            <li><strong>Départ:</strong> ${params.pickup || 'N/A'}</li>
            <li><strong>Arrivée:</strong> ${params.dropoff || 'N/A'}</li>
            <li><strong>Gamme:</strong> ${params.tierName || 'N/A'}</li>
            <li><strong>Montant:</strong> ${params.amount ? `${params.amount.toFixed(2)}€` : 'N/A'} (${params.paymentMethod || 'N/A'})</li>
          </ul>
        `,
    };
};

const getAdminCancellationNotificationContent = (params: Record<string, any> = {}) => {
    return {
        subject: `Réservation annulée (n°${params.reservationId || ''})`,
        html: `
          <h1>Une réservation a été annulée</h1>
          <p>La réservation n°${params.reservationId || ''} a été annulée.</p>
          <h2>Détails:</h2>
          <ul>
            <li><strong>Client:</strong> ${params.clientName || 'N/A'}</li>
            <li><strong>Statut:</strong> ${params.status || 'N/A'}</li>
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

    // Handle Admin-only emails
    if (input.type === 'reservation_cancelled_admin') {
        const adminEmailContent = getAdminCancellationNotificationContent(input.params);
        try {
            await transporter.sendMail({
                from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
                to: `"${'Admin'}" <${ADMIN_EMAIL}>`,
                subject: adminEmailContent.subject,
                html: adminEmailContent.html,
            });
            console.log(`Nodemailer sent admin cancellation notification for '${input.type}'.`);
            return { success: true };
        } catch (error) {
            console.error(`Error sending admin cancellation email for '${input.type}':`, error);
            return { success: false };
        }
    }


    // 1. Send main email to the user
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
      console.log(`Nodemailer sent email type '${input.type}' to ${input.to.email}. Message ID: ${info.messageId}`);
      userEmailSuccess = true;
      finalMessageId = info.messageId;
    } catch (error: any) {
      console.error(`Error sending email to ${input.to.email}:`, error);
      // We don't return here if it's a welcome email, so we still attempt to send the admin email.
      // If it's another type of email, we should return failure.
      if (input.type !== 'new_client_welcome' && input.type !== 'new_driver_welcome' && input.type !== 'new_reservation_client') {
          return { success: false };
      }
    }
    
    // 2. Send notification email to the admin for new users or new reservations
    let shouldSendAdminEmail = false;
    let adminEmailContent: { subject: string; html: string; };

    if (input.type === 'new_client_welcome' || input.type === 'new_driver_welcome') {
      const userType = input.type === 'new_client_welcome' ? 'Client' : 'Chauffeur';
      adminEmailContent = getAdminUserNotificationContent(userType, { name: input.to.name, email: input.to.email });
      shouldSendAdminEmail = true;
    } else if (input.type === 'new_reservation_client') {
      adminEmailContent = getAdminReservationNotificationContent(input.params);
      shouldSendAdminEmail = true;
    }
    
    if (shouldSendAdminEmail) {
      const adminMailOptions = {
          from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
          to: `"${'Admin'}" <${ADMIN_EMAIL}>`,
          subject: adminEmailContent!.subject,
          html: adminEmailContent!.html,
      };

      try {
          const info = await transporter.sendMail(adminMailOptions);
          console.log(`Nodemailer sent admin notification for '${input.type}'. Message ID: ${info.messageId}`);
      } catch (error: any) {
          console.error(`Error sending admin notification email for '${input.type}':`, error);
          // If the user email failed, this will also result in a failure.
          if (!userEmailSuccess) {
              return { success: false };
          }
      }
    }
    
    // Return success if the main user email was sent.
    return { success: userEmailSuccess, messageId: finalMessageId };
  }
);

    
