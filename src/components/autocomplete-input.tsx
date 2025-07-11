
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
  defaultValue?: string;
  value?: string; // Add value prop to make it a controlled component
}

const libraries = ['places'];

export function AutocompleteInput({
  icon,
  placeholder,
  onPlaceSelected,
  className,
  defaultValue = '',
  value = '',
}: AutocompleteInputProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any, // The type definition expects a specific string array
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.value = value;
    }
  }, [value]);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if(place.formatted_address) {
        onPlaceSelected(place.formatted_address);
      }
    }
  };
  
  // This effect ensures that if the input is blurred without selecting a suggestion,
  // the onPlaceSelected callback is still fired with the current input value.
  const handleBlur = () => {
    if(inputRef.current) {
        onPlaceSelected(inputRef.current.value);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onPlaceSelected(e.target.value);
  }

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
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className={`${className || ''} pl-10`}
          defaultValue={defaultValue}
          onBlur={handleBlur}
          onChange={handleChange}
        />
      </Autocomplete>
    </div>
  );
}
