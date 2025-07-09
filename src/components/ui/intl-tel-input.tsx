'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import intlTelInput from 'intl-tel-input';
import type { Options } from 'intl-tel-input';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '@/components/ui/input';

export interface IntlTelInputProps extends Omit<InputProps, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  options?: Partial<Options>;
}

export interface IntlTelInputRef {
  isValidNumber: () => boolean;
  getNumber: () => string;
}

const IntlTelInput = forwardRef<IntlTelInputRef, IntlTelInputProps>(
  ({ value, onChange, options, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const itiRef = useRef<intlTelInput.Plugin | null>(null);

    useEffect(() => {
      if (inputRef.current) {
        const itiInstance = intlTelInput(inputRef.current, {
          initialCountry: 'auto',
          geoIpLookup: (callback) => {
            fetch('https://ipinfo.io/json?token=YOUR_IPINFO_TOKEN') // Note: Add your token for geoIP lookup
              .then((res) => res.json())
              .then((data) => callback(data.country || 'fr'))
              .catch(() => callback('fr'));
          },
          separateDialCode: true,
          preferredCountries: ["fr","be","es","de","gb"],
          utilsScript: `https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.16/js/utils.js`,
          ...options,
        });
        itiRef.current = itiInstance;

        const handleInputChange = () => {
            if (itiRef.current) {
                onChange(itiRef.current.getNumber());
            }
        };

        inputRef.current.addEventListener('input', handleInputChange);
        inputRef.current.addEventListener('countrychange', handleInputChange);
        
        return () => {
          itiInstance.destroy();
          if (inputRef.current) {
            inputRef.current.removeEventListener('input', handleInputChange);
            inputRef.current.removeEventListener('countrychange', handleInputChange);
          }
        };
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options]);

    // Set the input value if the parent value changes
    useEffect(() => {
        if (itiRef.current && value !== itiRef.current.getNumber()) {
            itiRef.current.setNumber(value);
        }
    }, [value]);

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
        isValidNumber: () => {
            return itiRef.current?.isValidNumber() ?? false;
        },
        getNumber: () => {
            return itiRef.current?.getNumber() ?? '';
        }
    }));

    return (
      <Input
        ref={inputRef}
        type="tel"
        className={cn('w-full', className)}
        {...props}
      />
    );
  }
);

IntlTelInput.displayName = 'IntlTelInput';

export { IntlTelInput };
