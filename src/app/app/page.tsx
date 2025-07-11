
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadScript } from '@react-google-maps/api';

import { GoogleMap } from '@react-google-maps/api';
import { BookingForm, type BookingDetails } from '@/components/booking-form';
import { Card, CardContent } from '@/components/ui/card';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { Skeleton } from '@/components/ui/skeleton';

const libraries = ['places'] as any;
const mapContainerStyle = { height: '100%', width: '100%' };
const center = { lat: 48.8566, lng: 2.3522 }; // Paris

export default function AppHomePage() {
  const router = useRouter();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const handleBookingSubmit = (details: BookingDetails) => {
    const queryParams = new URLSearchParams();
    queryParams.set('pickup', details.pickup);
    queryParams.set('dropoff', details.dropoff);
    details.stops.forEach(stop => stop.address && queryParams.append('stop', stop.address));
    if (details.scheduledTime) {
      queryParams.set('scheduledTime', details.scheduledTime.toISOString());
    }
    if (details.passengers) queryParams.set('passengers', String(details.passengers));
    if (details.suitcases) queryParams.set('suitcases', String(details.suitcases));
    if (details.backpacks) queryParams.set('backpacks', String(details.backpacks));
    router.push(`/app/select-vehicle?${queryParams.toString()}`);
  }

  return (
    <div className="relative h-full w-full">
      {isLoaded ? (
        <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={12} options={{ disableDefaultUI: true }} />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent">
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-4">
            <BookingForm onSubmit={handleBookingSubmit} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
