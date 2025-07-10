
'use client';

import React, { useRef, useEffect } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { Skeleton } from './ui/skeleton';

interface AutocompleteInputProps {
  icon: React.ReactNode;
  placeholder: string;
  onPlaceSelected: (address: string) => void;
  className?: string;
}

const libraries = ['places'];

export function AutocompleteInput({
  icon,
  placeholder,
  onPlaceSelected,
  className,
}: AutocompleteInputProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any, // The type definition expects a specific string array
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      onPlaceSelected(place.formatted_address || '');
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <Skeleton className={className || "h-9 w-full"} />;

  return (
    <div className="relative w-full">
      {icon}
      <Autocomplete
        onLoad={(autocomplete) => {
          autocompleteRef.current = autocomplete;
        }}
        onPlaceChanged={handlePlaceChanged}
        options={{
          componentRestrictions: { country: 'fr' }, // Restrict to France
          fields: ['formatted_address', 'geometry', 'name'],
        }}
      >
        <Input
          type="text"
          placeholder={placeholder}
          className={`${className || ''} pl-10`}
        />
      </Autocomplete>
    </div>
  );
}
