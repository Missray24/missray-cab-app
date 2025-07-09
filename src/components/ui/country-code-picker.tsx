'use client'

import * as React from "react"
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

function countryCodeToEmoji(code: string) {
  if (!code) return ''
  const OFFSET = 127397
  const codePoints = code.toUpperCase().split('').map(char => char.charCodeAt(0) + OFFSET)
  return String.fromCodePoint(...codePoints)
}

interface CountryCodePickerProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function CountryCodePicker({ value, onValueChange, className }: CountryCodePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCountry = countries.find(
    (country) => country.dial_code === value
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value && selectedCountry ? (
            <div className="flex items-center gap-2">
              <span>{countryCodeToEmoji(selectedCountry.code)}</span>
              <span>{selectedCountry.dial_code}</span>
            </div>
           ) : (
            "Code"
           )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un pays..." />
          <CommandList>
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} (${country.dial_code})`}
                  onSelect={() => {
                    onValueChange(country.dial_code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.dial_code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2">{countryCodeToEmoji(country.code)}</span>
                  <span className="truncate">{country.name}</span>
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
