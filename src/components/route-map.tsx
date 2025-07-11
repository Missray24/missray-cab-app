
'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { Skeleton } from './ui/skeleton';

interface RouteMapProps {
  pickup: string;
  dropoff: string;
  stops?: string[];
  onRouteInfoFetched?: (info: { distance: string; duration: string }) => void;
  isInteractive?: boolean;
}

const libraries = ['places'];
const mapContainerStyle = { height: '100%', width: '100%' };
const center = { lat: 48.8566, lng: 2.3522 }; // Paris

// Function to generate numbered marker icons
const createNumberedIcon = (number: number) => {
    return {
        url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%237c3aed" stroke="white" stroke-width="2"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" fill="white" font-weight="bold">${number}</text></svg>`,
        scaledSize: new window.google.maps.Size(32, 32),
    };
};

export function RouteMap({ pickup, dropoff, stops = [], onRouteInfoFetched, isInteractive = true }: RouteMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any,
  });
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);
  
  const mapOptions = isInteractive ? {} : {
    disableDefaultUI: true,
    gestureHandling: 'none',
    zoomControl: false,
  };


  useEffect(() => {
    if (!isLoaded || !pickup || !dropoff) {
        setIsCalculating(false);
        return;
    };

    setIsCalculating(true);
    const directionsService = new google.maps.DirectionsService();

    const waypoints = stops
        .filter(stop => stop && stop.trim() !== '')
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
          if (onRouteInfoFetched) {
            const route = result.routes[0];
            let totalDistance = 0;
            let totalDuration = 0;
            for (const leg of route.legs) {
                totalDistance += leg.distance?.value || 0;
                totalDuration += leg.duration?.value || 0;
            }
            onRouteInfoFetched({
                distance: (totalDistance / 1000).toFixed(1) + ' km',
                duration: Math.round(totalDuration / 60) + ' min',
            });
          }
        } else {
          console.error(`error fetching directions ${result}`);
        }
        setIsCalculating(false);
      }
    );
  }, [isLoaded, pickup, dropoff, stops, onRouteInfoFetched]);

  // Adjust map bounds and zoom
  useEffect(() => {
    if (mapRef.current && directions?.routes[0]) {
      const route = directions.routes[0];
      const bounds = new google.maps.LatLngBounds();
      route.legs.forEach(leg => {
          bounds.extend(leg.start_location);
          bounds.extend(leg.end_location);
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [directions]);

  if (loadError) return <div className="flex items-center justify-center h-full w-full bg-destructive/10 text-destructive text-sm p-4">Erreur de chargement de la carte.</div>;
  if (!isLoaded || isCalculating) return <Skeleton className="h-full w-full" />;

  const route = directions?.routes[0];
  const startLocation = route?.legs[0]?.start_location;
  const endLocation = route?.legs[route.legs.length - 1]?.end_location;
  
  const waypointLocations = route?.legs.slice(0, -1).map(leg => leg.end_location);

  const startIcon = {
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%2322c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    scaledSize: new window.google.maps.Size(32, 32),
  };
  
  const endIcon = {
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    scaledSize: new window.google.maps.Size(32, 32),
  };

  return (
    <GoogleMap 
        mapContainerStyle={mapContainerStyle} 
        center={center} 
        zoom={12} 
        options={mapOptions}
        onLoad={map => { mapRef.current = map; }}
    >
      {directions ? (
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
          {waypointLocations?.map((location, index) => (
             <MarkerF key={index} position={location} icon={createNumberedIcon(index + 1)} />
          ))}
          {endLocation && <MarkerF position={endLocation} icon={endIcon} />}
        </>
      ) : (
        <div className="flex items-center justify-center h-full w-full bg-muted/50 text-muted-foreground text-sm p-4">Impossible de calculer le trajet.</div>
      )}
    </GoogleMap>
  );
}
