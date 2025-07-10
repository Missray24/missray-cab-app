
'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { Skeleton } from './ui/skeleton';

interface RouteMapProps {
  pickup: string;
  dropoff: string;
  stops?: string[];
}

const libraries = ['places'];
const mapContainerStyle = { height: '100%', width: '100%' };
const center = { lat: 48.8566, lng: 2.3522 }; // Paris

export function RouteMap({ pickup, dropoff, stops = [] }: RouteMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    if (!isLoaded || !pickup || !dropoff) return;

    const directionsService = new google.maps.DirectionsService();

    const waypoints = stops
        .filter(stop => stop.trim() !== '')
        .map(stop => ({ location: stop, stopover: true }));

    directionsService.route(
      {
        origin: pickup,
        destination: dropoff,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error(`error fetching directions ${result}`);
        }
      }
    );
  }, [isLoaded, pickup, dropoff, stops]);

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <Skeleton className="h-full w-full" />;

  const startLocation = directions?.routes[0]?.legs[0]?.start_location;
  const endLocation = directions?.routes[0]?.legs[directions.routes[0].legs.length - 1]?.end_location;
  
  // Custom marker SVGs
  const startIcon = {
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%2322c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    scaledSize: new google.maps.Size(32, 32),
  };
  
  const endIcon = {
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    scaledSize: new google.maps.Size(32, 32),
  };

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={12}>
      {directions && (
        <>
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true, // Hide default markers
              polylineOptions: {
                strokeColor: '#4A90E2',
                strokeWeight: 5,
              },
            }}
          />
          {startLocation && <MarkerF position={startLocation} icon={startIcon} />}
          {endLocation && <MarkerF position={endLocation} icon={endIcon} />}
        </>
      )}
    </GoogleMap>
  );
}
