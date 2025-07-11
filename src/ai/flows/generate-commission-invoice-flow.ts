
'use server';
/**
 * @fileOverview A flow for generating PDF commission invoices for drivers.
 * - generateCommissionInvoice - Fetches reservation and user data to create a PDF commission invoice.
 * - GenerateCommissionInvoiceInput - The input type for the flow.
 * - GenerateCommissionInvoiceOutput - The output type for the flow (PDF as a base64 string).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import type { Reservation, User } from '@/lib/types';

const GenerateCommissionInvoiceInputSchema = z.object({
  driverId: z.string().describe('The ID of the driver to generate an invoice for.'),
  reservationId: z.string().describe('The ID of the reservation to generate the commission invoice for.'),
});
export type GenerateCommissionInvoiceInput = z.infer<typeof GenerateCommissionInvoiceInputSchema>;

const GenerateCommissionInvoiceOutputSchema = z.object({
  pdfBase64: z.string().nullable().describe('The generated PDF invoice as a base64 encoded string.'),
  error: z.string().nullable().describe('An error message if the invoice generation failed.'),
});
export type GenerateCommissionInvoiceOutput = z.infer<typeof GenerateCommissionInvoiceOutputSchema>;

const MISSRAY_CAB_INFO = {
    name: 'MISSRAY CAB',
    address: '28 BOULEVARD DU COLOMBIER, 35000 RENNES',
    siret: '900 050 758 00011',
    vatNumber: 'FR49900050758',
};

export async function generateCommissionInvoice(input: GenerateCommissionInvoiceInput): Promise<GenerateCommissionInvoiceOutput> {
  return generateCommissionInvoiceFlow(input);
}

const generateCommissionInvoiceFlow = ai.defineFlow(
  {
    name: 'generateCommissionInvoiceFlow',
    inputSchema: GenerateCommissionInvoiceInputSchema,
    outputSchema: GenerateCommissionInvoiceOutputSchema,
  },
  async ({ driverId, reservationId }) => {
    try {
      // 1. Fetch Reservation and Driver data
      const resDocRef = doc(db, 'reservations', reservationId);
      const driverDocRef = doc(db, 'users', driverId);
      
      const [resDocSnap, driverDocSnap] = await Promise.all([
          getDoc(resDocRef),
          getDoc(driverDocRef)
      ]);

      if (!resDocSnap.exists()) {
        return { pdfBase64: null, error: 'Reservation not found.' };
      }
      if (!driverDocSnap.exists()) {
        return { pdfBase64: null, error: 'Driver not found.' };
      }
      
      const reservation = resDocSnap.data() as Reservation;
      const driver = driverDocSnap.data() as User;
      const driverCompany = driver.driverProfile?.company;
      const commissionRate = driverCompany?.commission || 20;

      if (!driverCompany) {
        return { pdfBase64: null, error: 'Driver company information is missing.' };
      }
      
      // 2. Create a new PDF Document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const margin = 50;

      // 3. Add Logo
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo-invoice.png');
        const logoImageBytes = await fs.readFile(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.25);
        page.drawImage(logoImage, {
            x: width - margin - logoDims.width,
            y: height - margin - logoDims.height,
            width: logoDims.width,
            height: logoDims.height,
        });
      } catch (e) {
        console.warn("Logo not found or could not be embedded. Skipping logo.");
      }

      // 4. Add Header Info (Emitter: MISSRAY CAB)
      let currentY = height - margin;
      page.drawText(MISSRAY_CAB_INFO.name, { x: margin, y: currentY, font: boldFont, size: 14 });
      currentY -= 15;
      page.drawText(MISSRAY_CAB_INFO.address, { x: margin, y: currentY, font, size: 10 });
      currentY -= 15;
      page.drawText(`SIRET: ${MISSRAY_CAB_INFO.siret}`, { x: margin, y: currentY, font, size: 10 });
      currentY -= 12;
      page.drawText(`N° TVA: ${MISSRAY_CAB_INFO.vatNumber}`, { x: margin, y: currentY, font, size: 10 });

      // 5. Add Recipient Info (Driver)
      currentY -= 40;
      page.drawText('Adressé à :', { x: margin, y: currentY, font: boldFont, size: 12 });
      currentY -= 15;
      page.drawText(driverCompany.name || driver.name, { x: margin, y: currentY, font, size: 10 });
      currentY -= 12;
      page.drawText(driverCompany.address || '', { x: margin, y: currentY, font, size: 10 });
      currentY -= 12;
      page.drawText(`SIRET: ${driverCompany.siret || 'N/A'}`, { x: margin, y: currentY, font, size: 10 });

      // 6. Add Invoice Details
      const invoiceNum = `COMM-${reservationId.substring(0, 6).toUpperCase()}`;
      const invoiceDate = new Date().toLocaleDateString('fr-FR');
      page.drawText('FACTURE DE COMMISSION', { x: width - margin - 200, y: height - margin - 80, font: boldFont, size: 18 });
      page.drawText(`Facture n°: ${invoiceNum}`, { x: width - margin - 200, y: height - margin - 105, font, size: 10 });
      page.drawText(`Date: ${invoiceDate}`, { x: width - margin - 200, y: height - margin - 120, font, size: 10 });
      page.drawText(`Course n°: ${reservationId}`, { x: width - margin - 200, y: height - margin - 135, font, size: 10 });


      currentY -= 60;

      // 7. Add Invoice Table
      // Table Header
      page.drawRectangle({ x: margin, y: currentY - 5, width: width - 2 * margin, height: 25, color: rgb(0.9, 0.9, 0.9) });
      page.drawText('Description', { x: margin + 10, y: currentY, font: boldFont, size: 10 });
      page.drawText('Montant HT', { x: width - margin - 150, y: currentY, font: boldFont, size: 10 });
      page.drawText('TVA (20%)', { x: width - margin - 90, y: currentY, font: boldFont, size: 10 });
      page.drawText('Montant TTC', { x: width - margin - 40, y: currentY, font: boldFont, size: 10 });
      currentY -= 30;

      // Table Row
      const rideGrossAmount = reservation.amount || 0;
      const commissionAmount = rideGrossAmount * (commissionRate / 100);
      const commissionVat = commissionAmount * 0.20;
      const commissionTotal = commissionAmount + commissionVat;

      const description = `Commission (${commissionRate}%) sur course du ${new Date(reservation.date).toLocaleDateString('fr-FR')} - ${reservation.clientName}`;
      page.drawText(description, { x: margin + 10, y: currentY, font, size: 10 });
      
      page.drawText(`${commissionAmount.toFixed(2)} €`, { x: width - margin - 150, y: currentY, font, size: 10 });
      page.drawText(`${commissionVat.toFixed(2)} €`, { x: width - margin - 90, y: currentY, font, size: 10 });
      page.drawText(`${commissionTotal.toFixed(2)} €`, { x: width - margin - 40, y: currentY, font, size: 10 });
      currentY -= 40;

      // 8. Add Totals
      const totalsX = width - margin - 150;
      page.drawLine({ start: { x: totalsX - 20, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5 });
      currentY -= 20;

      page.drawText('Total HT:', { x: totalsX, y: currentY, font, size: 10 });
      page.drawText(`${commissionAmount.toFixed(2)} €`, { x: width - margin - 40, y: currentY, font, size: 10 });
      currentY -= 15;

      page.drawText(`Total TVA (20%):`, { x: totalsX, y: currentY, font, size: 10 });
      page.drawText(`${commissionVat.toFixed(2)} €`, { x: width - margin - 40, y: currentY, font, size: 10 });
      currentY -= 20;

      page.drawText('Total Commission TTC:', { x: totalsX, y: currentY, font: boldFont, size: 12 });
      page.drawText(`${commissionTotal.toFixed(2)} €`, { x: width - margin - 40, y: currentY, font: boldFont, size: 12 });

      // 9. Add Footer
      const footerY = margin;
      page.drawLine({ start: {x: margin, y: footerY + 10}, end: {x: width - margin, y: footerY + 10}, thickness: 0.5 });
      const footerText = `${MISSRAY_CAB_INFO.name} - ${MISSRAY_CAB_INFO.address} - SIRET: ${MISSRAY_CAB_INFO.siret}`;
      page.drawText(footerText, { x: margin, y: footerY - 10, font, size: 8, color: rgb(0.5, 0.5, 0.5) });
      
      // 10. Serialize the PDF to base64
      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

      return { pdfBase64, error: null };

    } catch (error: any) {
      console.error('Error generating commission invoice PDF:', error);
      return { pdfBase64: null, error: 'An internal error occurred while generating the commission invoice.' };
    }
  }
);
