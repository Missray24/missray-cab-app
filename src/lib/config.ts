/**
 * @file This file centralizes the API keys and configuration for third-party services.
 * It reads environment variables and exports them for use throughout the application.
 */

// Server-side keys (should not be exposed to the client)
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// IONOS SMTP credentials
export const IONOS_SMTP_HOST = process.env.IONOS_SMTP_HOST;
export const IONOS_SMTP_PORT = process.env.IONOS_SMTP_PORT;
export const IONOS_SMTP_USER = process.env.IONOS_SMTP_USER;
export const IONOS_SMTP_PASS = process.env.IONOS_SMTP_PASS;


// Client-side keys (prefixed with NEXT_PUBLIC_ to be exposed to the browser)
export const NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
