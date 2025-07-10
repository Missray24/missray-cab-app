
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
  error: z.string().nullable().describe('An error message if the creation failed.'),
});
export type CreatePaymentIntentOutput = z.infer<typeof CreatePaymentIntentOutputSchema>;

// Initialize Stripe outside the flow to avoid re-creation on every call.
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

if (!stripe) {
  console.warn('Stripe key is not set. Payment functionality will be disabled.');
}

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
      const errorMessage = 'Stripe is not initialized. Please ensure STRIPE_SECRET_KEY is set in your environment variables.';
      console.error(errorMessage);
      return { clientSecret: null, error: errorMessage };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        automatic_payment_methods: { enabled: true },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        error: null,
      };
    } catch (error: any) {
      console.error('Error creating Stripe Payment Intent:', error);
      // It's better not to expose detailed Stripe errors to the client.
      return { clientSecret: null, error: 'An internal error occurred while creating the payment intent.' };
    }
  }
);
