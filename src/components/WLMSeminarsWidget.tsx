import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { getAffiliateCode, getAffiliateFromUrl } from '@/utils/affiliateCode';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, MapPin, Users, Clock, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const WLM_API_URL = 'https://xkxbdwhwkbzjowcdyhqq.supabase.co/functions/v1/public-seminars';
const WLM_BOOKING_URL = 'https://xkxbdwhwkbzjowcdyhqq.supabase.co/functions/v1/external-booking';

interface TimeSlot {
  time: string;
  capacity: number;
}

interface Seminar {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  date: string;
  time?: string | string[];
  time_slots?: TimeSlot[];
  location?: string;
  location_name?: string;
  location_address?: string;
  address?: string;
  capacity?: number;
  available_slots?: number;
  registered_count?: number;
  registration_url?: string;
  image_url?: string;
  speaker?: string;
  duration?: string;
}

interface BookingForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  time_slot: string;
  gdpr_consent: boolean;
}

interface FormErrors {
  email?: string;
  phone?: string;
}

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Remove spaces, dashes, parentheses for validation
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Accept international format or local CZ/SK format
  const phoneRegex = /^(\+?[1-9]\d{6,14}|\d{9})$/;
  return phoneRegex.test(cleaned);
};

export const WLMSeminarsWidget = () => {
  // Use centralized affiliate code utility - checks URL, localStorage (cad_affiliate_code), and cookie
  const [referralCode, setReferralCode] = useState<string>(() => {
    const code = getAffiliateCode();
    console.log('[WLMSeminarsWidget] Initial referral code from getAffiliateCode():', code);
    return code || '';
  });

  // Update referral code if URL parameter changes
  useEffect(() => {
    const urlCode = getAffiliateFromUrl();
    if (urlCode && urlCode !== referralCode) {
      console.log('[WLMSeminarsWidget] URL referral code detected, updating:', urlCode);
      setReferralCode(urlCode);
    }
  }, []);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [selectedSeminar, setSelectedSeminar] = useState<Seminar | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    time_slot: '',
    gdpr_consent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    const fetchSeminars = async () => {
      try {
        const { data: keyData, error: fetchError } = await supabase.functions.invoke('get-wlm-api-key');
        
        if (fetchError) {
          console.error('Error fetching WLM API key:', fetchError);
          setError('Nepodařilo se načíst semináře');
          setIsLoading(false);
          return;
        }

        const key = keyData?.apiKey;
        if (!key) {
          console.error('No API key received');
          setError('API klíč není k dispozici');
          setIsLoading(false);
          return;
        }

        setApiKey(key);

        const response = await fetch(WLM_API_URL, {
          method: 'GET',
          headers: {
            'x-api-key': key,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('WLM API error:', response.status, response.statusText);
          setError('Nepodařilo se načíst semináře z WLM');
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        console.log('WLM seminars loaded:', data);
        setSeminars(Array.isArray(data) ? data : data.seminars || []);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading WLM seminars:', err);
        setError('Chyba při načítání seminářů');
        setIsLoading(false);
      }
    };

    fetchSeminars();
  }, []);

  const fetchSeminarDetail = async (seminar: Seminar) => {
    if (!apiKey || !seminar.slug) {
      setSelectedSeminar(seminar);
      return;
    }

    setDetailLoading(true);
    setSelectedSeminar(seminar);
    setBookingSuccess(false);
    setBookingForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      time_slot: '',
      gdpr_consent: false,
    });

    try {
      const response = await fetch(`${WLM_API_URL}?slug=${encodeURIComponent(seminar.slug)}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const detailData = await response.json();
        console.log('Seminar detail loaded:', detailData);
        setSelectedSeminar(detailData);
        
        // Auto-select first time slot if available
        const timeSlots = getTimeSlots(detailData);
        if (timeSlots.length === 1) {
          setBookingForm(prev => ({ ...prev, time_slot: timeSlots[0] }));
        }
      }
    } catch (err) {
      console.error('Error fetching seminar detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getTimeSlots = (seminar: Seminar): string[] => {
    if (seminar.time_slots && seminar.time_slots.length > 0) {
      return seminar.time_slots.map(slot => slot.time);
    }
    if (Array.isArray(seminar.time)) {
      return seminar.time;
    }
    if (typeof seminar.time === 'string' && seminar.time) {
      return [seminar.time];
    }
    return [];
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: FormErrors = {};
    
    if (!validateEmail(bookingForm.email)) {
      errors.email = 'Zadejte platný e-mail';
    }
    
    if (!validatePhone(bookingForm.phone)) {
      errors.phone = 'Zadejte platné telefonní číslo (např. +420123456789)';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    
    if (!selectedSeminar?.slug || !apiKey) {
      toast.error('Chyba při odesílání rezervace');
      return;
    }

    if (!bookingForm.gdpr_consent) {
      toast.error('Musíte souhlasit se zpracováním osobních údajů');
      return;
    }

    if (!bookingForm.time_slot) {
      toast.error('Vyberte časový slot');
      return;
    }

    setIsSubmitting(true);

    // Debug logging for referral code
    console.log('[WLMSeminarsWidget] Submitting booking with referral code:', referralCode);

    const requestBody = {
      seminar_slug: selectedSeminar.slug,
      first_name: bookingForm.first_name,
      last_name: bookingForm.last_name,
      email: bookingForm.email,
      phone: bookingForm.phone,
      time_slot: bookingForm.time_slot,
      gdpr_consent: bookingForm.gdpr_consent,
      source_domain: window.location.hostname,
      ...(referralCode && { referral_code: referralCode }),
    };

    console.log('[WLMSeminarsWidget] Full request body:', requestBody);

    try {
      const response = await fetch(WLM_BOOKING_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Chyba při rezervaci');
      }

      setBookingSuccess(true);
      toast.success('Rezervace úspěšně odeslána!');
      
      // Call centralized create-or-update-lead to create local lead
      try {
        const leadPayload = {
          name: `${bookingForm.first_name} ${bookingForm.last_name}`.trim(),
          email: bookingForm.email,
          phone: bookingForm.phone || undefined,
          source_type: 'seminar_booking',
          source_page: window.location.pathname,
          affiliate_code: referralCode || undefined,
          seminar_slug: selectedSeminar.slug,
          time_slot: bookingForm.time_slot,
          seminar_accepted: true,
          metadata: {
            seminar_title: selectedSeminar.title,
            seminar_date: selectedSeminar.date,
          },
        };
        
        console.log('[WLMSeminarsWidget] Creating local lead:', leadPayload);
        
        await supabase.functions.invoke('create-or-update-lead', {
          body: leadPayload,
        });
      } catch (leadErr) {
        console.error('[WLMSeminarsWidget] Error creating local lead:', leadErr);
        // Don't fail the booking success
      }
      
      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Second burst for extra celebration
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    } catch (err) {
      console.error('Booking error:', err);
      toast.error(err instanceof Error ? err.message : 'Nepodařilo se odeslat rezervaci');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    setSelectedSeminar(null);
    setBookingSuccess(false);
  };

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (seminars.length === 0) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Žádné nadcházející semináře</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {seminars.map((seminar, index) => (
          <Card 
            key={seminar.slug || seminar.id || index} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => fetchSeminarDetail(seminar)}
          >
            {seminar.image_url && (
              <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                <img 
                  src={seminar.image_url} 
                  alt={seminar.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg line-clamp-2">{seminar.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {seminar.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {seminar.description}
                </p>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {format(new Date(seminar.date), 'PPP', { locale: cs })}
                  </span>
                </div>
                
                {seminar.time && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>{Array.isArray(seminar.time) ? seminar.time.join(', ') : seminar.time}</span>
                  </div>
                )}
                
                {(seminar.location_name || seminar.location) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{seminar.location_name || seminar.location}</span>
                  </div>
                )}
                
                {(seminar.capacity || seminar.available_slots !== undefined) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {seminar.available_slots !== undefined 
                        ? `${seminar.available_slots} volných míst`
                        : `${seminar.registered_count || 0} / ${seminar.capacity} míst`
                      }
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Seminar Detail Dialog */}
      <Dialog open={!!selectedSeminar} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : selectedSeminar && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl pr-8">{selectedSeminar.title}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {selectedSeminar.image_url && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg">
                    <img 
                      src={selectedSeminar.image_url} 
                      alt={selectedSeminar.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Datum</p>
                      <p className="font-medium">
                        {format(new Date(selectedSeminar.date), 'PPPP', { locale: cs })}
                      </p>
                    </div>
                  </div>

                  {(selectedSeminar.location_name || selectedSeminar.location) && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Místo</p>
                        <p className="font-medium">{selectedSeminar.location_name || selectedSeminar.location}</p>
                        {(selectedSeminar.location_address || selectedSeminar.address) && (
                          <p className="text-sm text-muted-foreground">{selectedSeminar.location_address || selectedSeminar.address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedSeminar.capacity || selectedSeminar.available_slots !== undefined) && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Kapacita</p>
                        <p className="font-medium">
                          {selectedSeminar.available_slots !== undefined 
                            ? `${selectedSeminar.available_slots} volných míst`
                            : `${selectedSeminar.registered_count || 0} / ${selectedSeminar.capacity} obsazeno`
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedSeminar.speaker && (
                  <div>
                    <h4 className="font-semibold mb-2">Přednášející</h4>
                    <p className="text-muted-foreground">{selectedSeminar.speaker}</p>
                  </div>
                )}

                {selectedSeminar.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Popis</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {selectedSeminar.description}
                    </p>
                  </div>
                )}

                {/* Booking Form */}
                {bookingSuccess ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600 dark:text-green-400" />
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                      Rezervace úspěšně odeslána!
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      Na váš e-mail jsme zaslali potvrzení. Těšíme se na vás!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="space-y-4 border-t pt-6">
                    <h4 className="font-semibold text-lg">Rezervace místa</h4>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Jméno *</Label>
                        <Input
                          id="first_name"
                          required
                          value={bookingForm.first_name}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="Jan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Příjmení *</Label>
                        <Input
                          id="last_name"
                          required
                          value={bookingForm.last_name}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Novák"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={bookingForm.email}
                          onChange={(e) => {
                            setBookingForm(prev => ({ ...prev, email: e.target.value }));
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                          }}
                          onBlur={(e) => {
                            if (e.target.value && !validateEmail(e.target.value)) {
                              setFormErrors(prev => ({ ...prev, email: 'Zadejte platný e-mail' }));
                            }
                          }}
                          placeholder="jan@example.com"
                          className={formErrors.email ? 'border-destructive' : ''}
                        />
                        {formErrors.email && (
                          <p className="text-sm text-destructive">{formErrors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          required
                          value={bookingForm.phone}
                          onChange={(e) => {
                            setBookingForm(prev => ({ ...prev, phone: e.target.value }));
                            if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: undefined }));
                          }}
                          onBlur={(e) => {
                            if (e.target.value && !validatePhone(e.target.value)) {
                              setFormErrors(prev => ({ ...prev, phone: 'Zadejte platné telefonní číslo (např. +420123456789)' }));
                            }
                          }}
                          placeholder="+420 123 456 789"
                          className={formErrors.phone ? 'border-destructive' : ''}
                        />
                        {formErrors.phone && (
                          <p className="text-sm text-destructive">{formErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    {getTimeSlots(selectedSeminar).length > 1 && (
                      <div className="space-y-2">
                        <Label>Vyberte čas *</Label>
                        <RadioGroup
                          value={bookingForm.time_slot}
                          onValueChange={(value) => setBookingForm(prev => ({ ...prev, time_slot: value }))}
                          className="flex flex-wrap gap-4"
                        >
                          {getTimeSlots(selectedSeminar).map((time) => (
                            <div key={time} className="flex items-center space-x-2">
                              <RadioGroupItem value={time} id={`time-${time}`} />
                              <Label htmlFor={`time-${time}`} className="cursor-pointer">
                                {time}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}

                    {getTimeSlots(selectedSeminar).length === 1 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Čas: {getTimeSlots(selectedSeminar)[0]}</span>
                      </div>
                    )}

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="gdpr"
                        checked={bookingForm.gdpr_consent}
                        onCheckedChange={(checked) => 
                          setBookingForm(prev => ({ ...prev, gdpr_consent: checked === true }))
                        }
                      />
                      <Label htmlFor="gdpr" className="text-sm leading-relaxed cursor-pointer">
                        Souhlasím se zpracováním osobních údajů za účelem registrace na seminář *
                      </Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Odesílám...
                        </>
                      ) : (
                        'Rezervovat místo'
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WLMSeminarsWidget;
