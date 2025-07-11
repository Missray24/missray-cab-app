
'use server';
/**
 * @fileOverview A flow for generating PDF invoices for reservations.
 * - generateInvoice - Fetches reservation and user data to create a PDF invoice.
 * - GenerateInvoiceInput - The input type for the flow (reservation ID).
 * - GenerateInvoiceOutput - The output type for the flow (PDF as a base64 string).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import type { Reservation, User } from '@/lib/types';

const GenerateInvoiceInputSchema = z.object({
  reservationId: z.string().describe('The ID of the reservation to generate an invoice for.'),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const GenerateInvoiceOutputSchema = z.object({
  pdfBase64: z.string().nullable().describe('The generated PDF invoice as a base64 encoded string.'),
  error: z.string().nullable().describe('An error message if the invoice generation failed.'),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;

// Helper function to draw text and handle line breaks
async function drawText(page: any, text: string, options: any) {
  const { x, y, font, size, maxWidth, lineHeight } = options;
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const width = font.widthOfTextAtSize(testLine, size);
    if (width > maxWidth && line) {
      page.drawText(line, { ...options, y: currentY });
      line = word;
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }
  page.drawText(line, { ...options, y: currentY });
  return currentY - lineHeight; // Return the Y position for the next line
}

export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}

const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async ({ reservationId }) => {
    try {
      // 1. Fetch Reservation data
      const resDocRef = doc(db, 'reservations', reservationId);
      const resDocSnap = await getDoc(resDocRef);
      if (!resDocSnap.exists()) {
        return { pdfBase64: null, error: 'Reservation not found.' };
      }
      const reservation = resDocSnap.data() as Reservation;

      // 2. Fetch Driver and Client data
      const driverDocRef = doc(db, 'users', reservation.driverId);
      const clientDocRef = doc(db, 'users', reservation.clientId);
      const [driverDocSnap, clientDocSnap] = await Promise.all([getDoc(driverDocRef), getDoc(clientDocRef)]);
      
      if (!driverDocSnap.exists() || !clientDocSnap.exists()) {
        return { pdfBase64: null, error: 'Driver or Client not found.' };
      }
      const driver = driverDocSnap.data() as User;
      const client = clientDocSnap.data() as User;
      const driverCompany = driver.driverProfile?.company;

      // 3. Create a new PDF Document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const margin = 50;

      // 4. Add Logo
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo-invoice.png');
        const logoImageBytes = await fs.readFile(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.25);
        page.drawImage(logoImage, {
            x: margin,
            y: height - margin - logoDims.height,
            width: logoDims.width,
            height: logoDims.height,
        });
      } catch (e) {
        console.warn("Logo not found or could not be embedded. Skipping logo.");
      }

      // 5. Add Header Info
      page.drawText('FACTURE', { x: width - margin - 150, y: height - margin, font: boldFont, size: 24 });
      page.drawText(`Facture n°: INV-${reservationId.substring(0, 8).toUpperCase()}`, { x: width - margin - 150, y: height - margin - 25, font, size: 10 });
      page.drawText(`Date: ${new Date(reservation.date).toLocaleDateString('fr-FR')}`, { x: width - margin - 150, y: height - margin - 40, font, size: 10 });

      // 6. Add Company and Client Info
      let currentY = height - margin - 120;
      page.drawText('Prestataire (Chauffeur)', { x: margin, y: currentY, font: boldFont, size: 12 });
      page.drawText(driverCompany?.name || driver.name, { x: margin, y: currentY - 15, font, size: 10 });
      page.drawText(driverCompany?.address || '', { x: margin, y: currentY - 30, font, size: 10 });
      page.drawText(`SIRET: ${driverCompany?.siret || 'N/A'}`, { x: margin, y: currentY - 45, font, size: 10 });

      page.drawText('Client', { x: width / 2, y: currentY, font: boldFont, size: 12 });
      page.drawText(client.name, { x: width / 2, y: currentY - 15, font, size: 10 });
      page.drawText(client.email, { x: width / 2, y: currentY - 30, font, size: 10 });
      
      currentY -= 80;

      // 7. Add Invoice Table
      // Table Header
      page.drawRectangle({ x: margin, y: currentY - 5, width: width - 2 * margin, height: 25, color: rgb(0.9, 0.9, 0.9) });
      page.drawText('Description', { x: margin + 10, y: currentY, font: boldFont, size: 10 });
      page.drawText('Montant HT', { x: width - margin - 150, y: currentY, font: boldFont, size: 10 });
      page.drawText('Montant TTC', { x: width - margin - 70, y: currentY, font: boldFont, size: 10 });
      currentY -= 30;

      // Table Row
      const rideDescription = `Course VTC du ${new Date(reservation.date).toLocaleDateString('fr-FR')} de "${reservation.pickup}" à "${reservation.dropoff}"`;
      const descriptionY = await drawText(page, rideDescription, { x: margin + 10, y: currentY, font, size: 10, maxWidth: width - margin * 4 - 150, lineHeight: 12 });
      page.drawText(`${(reservation.totalAmount - reservation.vatAmount).toFixed(2)} €`, { x: width - margin - 150, y: currentY, font, size: 10 });
      page.drawText(`${reservation.totalAmount.toFixed(2)} €`, { x: width - margin - 70, y: currentY, font, size: 10 });
      currentY = descriptionY - 20;

      // 8. Add Totals
      const totalsX = width - margin - 150;
      page.drawLine({ start: { x: totalsX - 20, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5 });
      currentY -= 20;

      page.drawText('Sous-total HT:', { x: totalsX, y: currentY, font, size: 10 });
      page.drawText(`${(reservation.totalAmount - reservation.vatAmount).toFixed(2)} €`, { x: width - margin - 70, y: currentY, font, size: 10 });
      currentY -= 15;

      page.drawText(`TVA (10%):`, { x: totalsX, y: currentY, font, size: 10 });
      page.drawText(`${reservation.vatAmount.toFixed(2)} €`, { x: width - margin - 70, y: currentY, font, size: 10 });
      currentY -= 20;

      page.drawText('Total TTC:', { x: totalsX, y: currentY, font: boldFont, size: 12 });
      page.drawText(`${reservation.totalAmount.toFixed(2)} €`, { x: width - margin - 70, y: currentY, font: boldFont, size: 12 });

      // 9. Add Footer
      const footerY = margin;
      page.drawLine({ start: {x: margin, y: footerY + 10}, end: {x: width - margin, y: footerY + 10}, thickness: 0.5 });
      const footerText = `${driverCompany?.name || driver.name} - ${driverCompany?.address || ''} - SIRET: ${driverCompany?.siret || 'N/A'}`;
      page.drawText(footerText, { x: margin, y: footerY - 10, font, size: 8, color: rgb(0.5, 0.5, 0.5) });
      if (driverCompany?.isVatSubjected === false) {
          page.drawText(`TVA non applicable, art. 293 B du CGI`, { x: margin, y: footerY - 22, font, size: 8, color: rgb(0.5, 0.5, 0.5) });
      }


      // 10. Serialize the PDF to base64
      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

      return { pdfBase64, error: null };

    } catch (error: any) {
      console.error('Error generating invoice PDF:', error);
      return { pdfBase64: null, error: 'An internal error occurred while generating the invoice.' };
    }
  }
);
