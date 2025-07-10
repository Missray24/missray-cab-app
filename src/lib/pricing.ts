
import type { ServiceTier } from './types';

/**
 * Calculates the estimated price of a ride.
 *
 * @param tier - The service tier object with pricing details.
 * @param distanceStr - The distance of the ride as a string (e.g., "15.3 km").
 * @param durationStr - The duration of the ride as a string (e.g., "25 min").
 * @param numStops - The number of intermediate stops.
 * @returns The calculated price, respecting the minimum price of the tier.
 */
export function calculatePrice(
  tier: ServiceTier,
  distanceStr: string | null,
  durationStr: string | null,
  numStops: number
): number {
  if (!distanceStr || !durationStr) {
    return tier.minimumPrice;
  }

  // Parse distance and duration from strings
  const distanceInKm = parseFloat(distanceStr.replace(/,/g, '.').replace(/[^\d.-]/g, ''));
  const durationInMinutes = parseInt(durationStr.replace(/[^\d]/g, ''), 10);

  if (isNaN(distanceInKm) || isNaN(durationInMinutes)) {
    return tier.minimumPrice;
  }

  // Calculate the price based on tier rates
  const price =
    tier.baseFare +
    distanceInKm * tier.perKm +
    durationInMinutes * tier.perMinute +
    numStops * tier.perStop;

  // The final price is the higher of the calculated price and the minimum price
  const finalPrice = Math.max(price, tier.minimumPrice);

  return finalPrice;
}

    