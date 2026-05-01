import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

interface PhoneInputWithValidationProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  showWhatsAppValidation?: boolean;
}

// Common country codes for Europe and Americas
const countryCodes = [
  { code: "+420", country: "CZ", flag: "🇨🇿", name: "Česko" },
  { code: "+421", country: "SK", flag: "🇸🇰", name: "Slovensko" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Německo" },
  { code: "+43", country: "AT", flag: "🇦🇹", name: "Rakousko" },
  { code: "+48", country: "PL", flag: "🇵🇱", name: "Polsko" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "Velká Británie" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "USA / Kanada" },
  { code: "+506", country: "CR", flag: "🇨🇷", name: "Kostarika" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "Španělsko" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "Francie" },
  { code: "+39", country: "IT", flag: "🇮🇹", name: "Itálie" },
  { code: "+31", country: "NL", flag: "🇳🇱", name: "Nizozemsko" },
  { code: "+32", country: "BE", flag: "🇧🇪", name: "Belgie" },
  { code: "+41", country: "CH", flag: "🇨🇭", name: "Švýcarsko" },
  { code: "+36", country: "HU", flag: "🇭🇺", name: "Maďarsko" },
  { code: "+45", country: "DK", flag: "🇩🇰", name: "Dánsko" },
  { code: "+46", country: "SE", flag: "🇸🇪", name: "Švédsko" },
  { code: "+47", country: "NO", flag: "🇳🇴", name: "Norsko" },
  { code: "+358", country: "FI", flag: "🇫🇮", name: "Finsko" },
  { code: "+7", country: "RU", flag: "🇷🇺", name: "Rusko" },
  { code: "+380", country: "UA", flag: "🇺🇦", name: "Ukrajina" },
];

// Regex for phone number without country code (just digits, optionally with spaces)
const phoneNumberRegex = /^\d{6,15}$/;

// Clean phone number - remove spaces, dashes, parentheses
const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-\(\)]/g, '');
};

// Validate if phone number (without prefix) is valid
export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = cleanPhoneNumber(phone);
  return phoneNumberRegex.test(cleaned);
};

// Validate international format
export const isValidInternationalPhone = (phone: string): boolean => {
  const cleaned = cleanPhoneNumber(phone);
  return /^\+[1-9]\d{6,14}$/.test(cleaned);
};

// Extract country code from phone number
const extractCountryCode = (phone: string): { code: string; number: string } => {
  const cleaned = phone.trim();
  
  // Try to find matching country code
  for (const country of countryCodes) {
    if (cleaned.startsWith(country.code)) {
      return {
        code: country.code,
        number: cleaned.slice(country.code.length).trim()
      };
    }
  }
  
  // Default to Czech Republic if no match
  if (cleaned.startsWith('+')) {
    return { code: "+420", number: cleaned.replace(/^\+\d+\s*/, '') };
  }
  
  return { code: "+420", number: cleaned };
};

export const PhoneInputWithValidation = ({
  value,
  onChange,
  required = false,
  placeholder = "Telefon",
  className = "",
  showWhatsAppValidation = false,
}: PhoneInputWithValidationProps) => {
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState(true);
  
  // Extract country code and number from value
  const { code: initialCode, number: initialNumber } = extractCountryCode(value);
  const [selectedCode, setSelectedCode] = useState(initialCode);
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);

  // Update phone number when value changes externally
  useEffect(() => {
    if (!value) {
      setPhoneNumber('');
      return;
    }
    const { code, number } = extractCountryCode(value);
    setSelectedCode(code);
    setPhoneNumber(number);
  }, [value]);

  useEffect(() => {
    if (showWhatsAppValidation && touched && phoneNumber) {
      const fullNumber = `${selectedCode}${cleanPhoneNumber(phoneNumber)}`;
      setIsValid(isValidInternationalPhone(fullNumber));
    } else {
      setIsValid(true);
    }
  }, [phoneNumber, selectedCode, showWhatsAppValidation, touched]);

  const handleCodeChange = (newCode: string) => {
    setSelectedCode(newCode);
    const fullNumber = `${newCode} ${phoneNumber}`;
    onChange(fullNumber);
  };

  const handleNumberChange = (newNumber: string) => {
    // Only allow digits and spaces
    const filtered = newNumber.replace(/[^\d\s]/g, '');
    setPhoneNumber(filtered);
    const fullNumber = `${selectedCode} ${filtered}`;
    onChange(fullNumber);
  };

  const showError = showWhatsAppValidation && touched && phoneNumber && !isValid;
  const selectedCountry = countryCodes.find(c => c.code === selectedCode);

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Select value={selectedCode} onValueChange={handleCodeChange}>
          <SelectTrigger className={`w-[110px] bg-secondary border-border text-foreground [&>svg]:hidden ${showError ? 'border-destructive' : ''}`}>
            <SelectValue>
              {selectedCountry ? (
                <span className="flex items-center gap-2 whitespace-nowrap overflow-visible">
                  <span className="text-base leading-none">{selectedCountry.flag}</span>
                  <span className="text-sm">{selectedCountry.code}</span>
                </span>
              ) : (
                "+420"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-[200] max-h-[300px]" position="popper">
            {countryCodes.map((country) => (
              <SelectItem 
                key={country.code} 
                value={country.code}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span className="font-medium">{country.code}</span>
                  <span className="text-muted-foreground text-xs">{country.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          placeholder={showWhatsAppValidation ? "XXX XXX XXX" : placeholder}
          value={phoneNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          onBlur={() => setTouched(true)}
          required={required}
          className={`flex-1 ${className} ${showError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        />
      </div>
      {showWhatsAppValidation && (
        <p className={`text-xs ${showError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {showError 
            ? "Pro WhatsApp zadejte platné telefonní číslo"
            : "Pro WhatsApp zadejte telefonní číslo bez předvolby"
          }
        </p>
      )}
    </div>
  );
};
