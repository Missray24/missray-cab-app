

import type { SelectedOption, ServiceTier } from './types';
import { reservationOptions } from './types';

/**
 * Calculates the estimated price of a ride.
 *
 * @param tier - The service tier object with pricing details.
 * @param distanceStr - The distance of the ride as a string (e.g., "15.3 km").
 * @param durationStr - The duration of the ride as a string (e.g., "25 min").
 * @param numStops - The number of intermediate stops.
 * @param selectedOptions - An array of selected options with their quantities.
 * @returns The calculated price, respecting the minimum price of the tier.
 */
export function calculatePrice(
  tier: ServiceTier,
  distanceStr: string | null,
  durationStr: string | null,
  numStops: number,
  selectedOptions: SelectedOption[] = []
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

  // Calculate the base price for the ride
  const ridePrice =
    tier.baseFare +
    distanceInKm * tier.perKm +
    durationInMinutes * tier.perMinute +
    numStops * tier.perStop;

  // Calculate the price for the selected options
  const optionsPrice = selectedOptions.reduce((total, selectedOption) => {
    const optionInfo = reservationOptions.find(o => o.name === selectedOption.name);
    if (optionInfo) {
      return total + (optionInfo.price * selectedOption.quantity);
    }
    return total;
  }, 0);
  
  const totalPrice = ridePrice + optionsPrice;

  // The final price is the higher of the calculated total price and the minimum price
  const finalPrice = Math.max(totalPrice, tier.minimumPrice);

  return finalPrice;
}
