
'use client'

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { countries } from "@/lib/countries"

interface CountryCodePickerProps {
  value?: string; // Expects 2-letter country code, e.g. "FR"
  onValueChange: (value: string) => void;
  className?: string;
}

export function CountryCodePicker({ value, onValueChange, className }: CountryCodePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCountry = React.useMemo(() => {
    return countries.find((country) => country.code.toUpperCase() === value?.toUpperCase())
  }, [value])

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue.toUpperCase());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
               <Image
                 src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                 width={20}
                 height={15}
                 alt={selectedCountry.name}
               />
              <span>{`${selectedCountry.code} (${selectedCountry.dial_code})`}</span>
            </span>
           ) : (
            "Select Code"
           )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            const country = countries.find(c => c.code.toLowerCase() === itemValue);
            if (!country) return 0;
            
            const searchValue = search.toLowerCase();
            const searchableText = `${country.name} ${country.dial_code} ${country.code}`.toLowerCase();
            
            return searchableText.includes(searchValue) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Rechercher un pays..." />
          <CommandList>
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.code.toLowerCase()}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toUpperCase() === country.code.toUpperCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Image
                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                    width={20}
                    height={15}
                    alt={country.name}
                    className="mr-2"
                  />
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="ml-auto text-muted-foreground">{country.dial_code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
