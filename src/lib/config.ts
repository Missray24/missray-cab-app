/**
 * @file This file centralizes the API keys and configuration for third-party services.
 * It reads environment variables and exports them for use throughout the application.
 */

// Force loading of environment variables from .env.local
require('dotenv').config();

// Server-side keys (should not be exposed to the client)
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Brevo SMTP credentials
export const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST;
export const BREVO_SMTP_PORT = process.env.BREVO_SMTP_PORT;
export const BREVO_SMTP_USER = process.env.BREVO_SMTP_USER;
export const BREVO_SMTP_PASS = process.env.BREVO_SMTP_PASS;


// Client-side keys (prefixed with NEXT_PUBLIC_ to be exposed to the browser)
export const NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
