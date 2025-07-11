
'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, X, Calendar as CalendarIcon, Users, Briefcase, Crosshair, Backpack } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { AutocompleteInput } from '@/components/autocomplete-input';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';


export interface BookingDetails {
    pickup: string;
    dropoff: string;
    stops: { id: number; address: string }[];
    scheduledTime: Date | null;
    passengers?: number;
    suitcases?: number;
    carryOnLuggage?: number;
}

interface BookingFormProps {
    initialDetails?: Partial<BookingDetails>;
    onSubmit: (details: BookingDetails) => void;
    submitButtonText?: string;
}

const specialLocationKeywords = ['gare', 'aéroport', 'aeroport', 'port'];

const NumberSelect = ({
    value,
    onValueChange,
    max,
    min = 0,
    placeholder,
    icon
}: {
    value: number;
    onValueChange: (value: number) => void;
    max: number;
    min?: number;
    placeholder: string;
    icon: React.ReactNode;
}) => (
    <Select
        value={String(value)}
        onValueChange={(val) => onValueChange(Number(val))}
    >
        <SelectTrigger className="w-full h-9 bg-white">
             <div className="flex items-center gap-2">
                <div className="text-primary">{icon}</div>
                <SelectValue placeholder={placeholder} />
            </div>
        </SelectTrigger>
        <SelectContent>
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(num => (
                <SelectItem key={num} value={String(num)}>
                    {num}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);


export function BookingForm({ initialDetails = {}, onSubmit, submitButtonText = "Voir les véhicules" }: BookingFormProps) {
  const { toast } = useToast();
  
  const [pickupAddress, setPickupAddress] = useState(initialDetails.pickup || '');
  const [stops, setStops] = useState<{ id: number; address: string }[]>(
    (initialDetails.stops || []).map((address, i) => ({ id: Date.now() + i, address: address.address }))
  );
  const [dropoffAddress, setDropoffAddress] = useState(initialDetails.dropoff || '');
  const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(initialDetails.scheduledTime || null);

  const [isSpecialLocation, setIsSpecialLocation] = useState(false);
  const [passengers, setPassengers] = useState<number>(initialDetails.passengers || 1);
  const [suitcases, setSuitcases] = useState<number>(initialDetails.suitcases || 0);
  const [carryOnLuggage, setCarryOnLuggage] = useState<number>(initialDetails.carryOnLuggage || 0);

  useEffect(() => {
    const checkSpecialLocation = (address: string) => 
        specialLocationKeywords.some(keyword => address.toLowerCase().includes(keyword));

    if (checkSpecialLocation(pickupAddress) || checkSpecialLocation(dropoffAddress)) {
        setIsSpecialLocation(true);
    } else {
        setIsSpecialLocation(false);
    }
  }, [pickupAddress, dropoffAddress]);

  const handleAddStop = () => {
    if (stops.length < 4) {
      setStops(prev => [...prev, { id: Date.now(), address: '' }]);
    }
  };

  const handleRemoveStop = (id: number) => {
    setStops(prev => prev.filter(stop => stop.id !== id));
  };
  
  const handleStopChange = (id: number, address: string) => {
    setStops(prev => prev.map(stop => stop.id === id ? { ...stop, address } : stop));
  };

  const handleDateTimeChange = (date: Date | undefined, time: string) => {
    if (!date) {
        setScheduledDateTime(null);
        return;
    }
    const [hours, minutes] = time.split(':').map(Number);
    const newDateTime = new Date(date);
    newDateTime.setHours(hours, minutes);
    setScheduledDateTime(newDateTime);
  };
  
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'La géolocalisation n\'est pas supportée par votre navigateur.' });
        return;
    }
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
            const data = await response.json();
            if (data.results && data.results[0]) {
                const address = data.results[0].formatted_address;
                setPickupAddress(address);
            } else {
                throw new Error('No results found');
            }
        } catch (error) {
            console.error("Error reverse geocoding:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de trouver une adresse pour votre position.' });
        }
    }, (error) => {
        console.error("Geolocation error:", error);
        toast({ variant: 'destructive', title: 'Erreur de géolocalisation', description: 'Impossible d\'obtenir votre position. Veuillez vérifier vos autorisations.' });
    });
  };

  const handleSubmit = () => {
    if (!pickupAddress || !dropoffAddress) {
      toast({
        variant: 'destructive',
        title: 'Champs requis',
        description: 'Veuillez renseigner une adresse de départ et d\'arrivée.',
      });
      return;
    }
    
    onSubmit({
        pickup: pickupAddress,
        dropoff: dropoffAddress,
        stops: stops.filter(s => s.address),
        scheduledTime: scheduledDateTime,
        ...(isSpecialLocation && { passengers, suitcases, carryOnLuggage })
    });
  }

  return (
    <div className="space-y-4">
       <div className="relative flex items-center">
            <AutocompleteInput
                icon={<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 animate-icon-pulse" />}
                placeholder="Adresse de départ"
                onPlaceSelected={(address) => setPickupAddress(address)}
                defaultValue={pickupAddress}
                value={pickupAddress} // Controlled component
                className="h-9 text-base bg-white pr-10" // Add padding for the button
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={handleGeolocate}
                aria-label="Me localiser"
            >
                <Crosshair className="h-4 w-4" />
            </Button>
        </div>
      
      {stops.map((stop, index) => (
        <div key={stop.id} className="flex items-center gap-2">
           <AutocompleteInput
            icon={<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
            placeholder={`Arrêt ${index + 1}`}
            onPlaceSelected={(address) => handleStopChange(stop.id, address)}
            defaultValue={stop.address}
            className="h-9 text-base bg-white"
           />
           <Button size="icon" variant="ghost" aria-label="Supprimer l'arrêt" className="h-9 w-9 shrink-0" onClick={() => handleRemoveStop(stop.id)}>
              <X className="h-5 w-5 text-muted-foreground hover:text-destructive" />
           </Button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
           <AutocompleteInput
            icon={<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />}
            placeholder="Adresse d'arrivée"
            onPlaceSelected={(address) => setDropoffAddress(address)}
            defaultValue={dropoffAddress}
            className="h-9 text-base bg-white"
           />
        </div>
        <Button size="icon" aria-label="Ajouter un arrêt" className="h-9 w-9 shrink-0" onClick={handleAddStop} disabled={stops.length >= 4}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {isSpecialLocation && (
          <div className="grid grid-cols-3 gap-2">
               <NumberSelect
                    icon={<Users className="h-4 w-4" />}
                    value={passengers}
                    onValueChange={setPassengers}
                    placeholder='Passagers'
                    min={1}
                    max={8}
                />
                <NumberSelect
                    icon={<Briefcase className="h-4 w-4" />}
                    value={suitcases}
                    onValueChange={setSuitcases}
                    placeholder='Valises'
                    min={0}
                    max={10}
                />
                <NumberSelect
                    icon={<Backpack className="h-4 w-4" />}
                    value={carryOnLuggage}
                    onValueChange={setCarryOnLuggage}
                    placeholder='Bagages à main'
                    min={0}
                    max={10}
                />
          </div>
      )}

      <div className="flex items-center gap-2">
         <div className="relative inline-flex h-9 w-full">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="default" className="rounded-r-none h-full pl-3 pr-2">
                        <CalendarIcon className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                    <Label>Date de la course</Label>
                    <Calendar
                        mode="single"
                        selected={scheduledDateTime ?? undefined}
                        onSelect={(day) => handleDateTimeChange(day, scheduledDateTime ? format(scheduledDateTime, 'HH:mm') : '12:00')}
                        initialFocus
                        locale={fr}
                    />
                    <div className="mt-2">
                      <Label htmlFor="time-picker">Heure de départ</Label>
                      <Input 
                          id="time-picker"
                          type="time" 
                          defaultValue={scheduledDateTime ? format(scheduledDateTime, 'HH:mm') : '12:00'}
                          onChange={(e) => handleDateTimeChange(scheduledDateTime || new Date(), e.target.value)}
                          className="mt-1"
                      />
                    </div>
                </PopoverContent>
            </Popover>
             <Separator orientation="vertical" className="h-full w-px bg-white/20" />
            <Button size="lg" className="flex-1 h-full text-base rounded-l-none" onClick={handleSubmit}>
              {submitButtonText}
            </Button>
        </div>
      </div>

      {scheduledDateTime && (
        <div className="flex items-center justify-between text-sm text-foreground bg-primary/10 p-2 rounded-md">
          <span className="font-medium">
            Programmé pour le {format(scheduledDateTime, 'dd MMM. yyyy \'à\' HH:mm', { locale: fr })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setScheduledDateTime(null)}
            aria-label="Annuler la programmation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
