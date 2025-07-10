
'use server';
/**
 * @fileOverview A flow for creating a Stripe Payment Intent.
 * - createPaymentIntent - Creates a payment intent and returns the client secret.
 * - CreatePaymentIntentInput - The input type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '@/lib/config';

const CreatePaymentIntentInputSchema = z.object({
  amount: z.number().int().positive().describe('The amount for the payment intent in the smallest currency unit (e.g., cents).'),
  currency: z.string().default('eur').describe('The currency for the payment intent.'),
});
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentInputSchema>;

const CreatePaymentIntentOutputSchema = z.object({
  clientSecret: z.string().nullable().describe('The client secret from the created Payment Intent.'),
});
export type CreatePaymentIntentOutput = z.infer<typeof CreatePaymentIntentOutputSchema>;

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Payment functionality will be disabled.');
}

// Initialize Stripe outside the flow to avoid re-creation on every call.
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
  return createPaymentIntentFlow(input);
}

const createPaymentIntentFlow = ai.defineFlow(
  {
    name: 'createPaymentIntentFlow',
    inputSchema: CreatePaymentIntentInputSchema,
    outputSchema: CreatePaymentIntentOutputSchema,
  },
  async (input) => {
    if (!stripe) {
      console.error('Stripe is not initialized. Cannot create payment intent.');
      return { clientSecret: null };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        automatic_payment_methods: { enabled: true },
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error: any) {
      console.error('Error creating Stripe Payment Intent:', error);
      // It's better not to expose detailed Stripe errors to the client.
      return { clientSecret: null };
    }
  }
);
