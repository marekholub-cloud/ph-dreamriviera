import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";
import {
  ChevronRight,
  ChevronLeft,
  Target,
  Globe,
  Clock,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { cs } from "date-fns/locale";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";
import { getAffiliateCode, getReferrerIdFromCode } from "@/utils/affiliateCode";

interface SupertipFormProps {
  onComplete?: () => void;
}

const STEPS = [
  { id: 1, title: "Investiční filozofie", icon: Target },
  { id: 2, title: "Kapitál a lokality", icon: Globe },
  { id: 3, title: "Časový horizont", icon: Clock },
  { id: 4, title: "Kontaktní údaje", icon: User },
  { id: 5, title: "Rezervace hovoru", icon: CalendarDays },
];

export const SupertipForm = ({ onComplete }: SupertipFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Available hours for consultation (10:00-18:00)
  const availableHours = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  const [formData, setFormData] = useState({
    // Block 1
    primaryGoal: "",
    experience: "",
    // Block 2
    markets: [] as string[],
    budgetRange: "",
    financing: "",
    // Block 3
    investmentHorizon: "",
    timeline: "",
    topPriority: "",
    // Contact
    name: "",
    email: "",
    phone: "",
  });

  const handleMarketToggle = (market: string) => {
    setFormData((prev) => ({
      ...prev,
      markets: prev.markets.includes(market)
        ? prev.markets.filter((m) => m !== market)
        : [...prev.markets, market],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.primaryGoal && formData.experience;
      case 2:
        return formData.markets.length > 0 && formData.budgetRange && formData.financing;
      case 3:
        return formData.investmentHorizon && formData.timeline && formData.topPriority;
      case 4:
        return formData.name && formData.email && formData.phone;
      case 5:
        return selectedDate && selectedTime;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);

    try {
      // Create full datetime with selected time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const consultationDateTime = new Date(selectedDate);
      consultationDateTime.setHours(hours, minutes, 0, 0);

      // Get affiliate code and find referrer
      const affiliateCode = getAffiliateCode();
      let referrerId = user?.id || null;
      
      // If no logged in user but has affiliate code, find the referrer
      if (!user && affiliateCode) {
        referrerId = await getReferrerIdFromCode(affiliateCode);
      }

      // Level 3: Supertip - Qualified investor with 100% warmth
      // questionnaire_completed_independently = true because user filled it themselves
      const leadData = {
        referrer_id: referrerId,
        referred_by: referrerId,
        lead_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: "qualified",
        warmth_level: 100,
        lead_level: 3,
        affiliate_code: affiliateCode,
        budget: formData.budgetRange,
        investment_goals: formData.primaryGoal,
        investment_timeline: formData.timeline,
        preferred_contact_time: consultationDateTime.toISOString(),
        questionnaire_completed_independently: true, // User filled form without salesperson
        seminar_accepted: false, // Will be set to true if they accept seminar invitation
        commission_rate: 0.01, // 1% * 1.0 coefficient
        notes: `Investiční zkušenosti: ${formData.experience}\nPreferované trhy: ${formData.markets.join(", ")}\nFinancování: ${formData.financing}\nHorizont: ${formData.investmentHorizon}\nTop priorita: ${formData.topPriority}\nTyp konzultace: ADMIN REZERVA`,
      };

      const { error } = await supabase.from("leads").insert(leadData);

      if (error) throw error;

      triggerConfetti();
      setIsComplete(true);

      toast({
        title: "Formulář odeslán!",
        description: "Brzy vás budeme kontaktovat. Děkujeme za váš zájem o investice.",
      });

      onComplete?.();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat formulář. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Jaký je váš primární cíl investice?
              </Label>
              <RadioGroup
                value={formData.primaryGoal}
                onValueChange={(value) => setFormData({ ...formData, primaryGoal: value })}
                className="space-y-3"
              >
                {[
                  { value: "cashflow", label: "Maximální cashflow (měsíční příjem z pronájmu)" },
                  { value: "appreciation", label: "Dlouhodobé zhodnocení ceny nemovitosti v čase" },
                  { value: "safety", label: "Bezpečné uložení úspor a ochrana před inflací" },
                  { value: "mixed", label: "Kombinace vlastního užívání a následného pronájmu" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Jaká je vaše zkušenost s investováním do realit?
              </Label>
              <RadioGroup
                value={formData.experience}
                onValueChange={(value) => setFormData({ ...formData, experience: value })}
                className="space-y-3"
              >
                {[
                  { value: "beginner", label: "Jsem v oboru nováček, hledám kompletní servis na klíč" },
                  { value: "intermediate", label: "Vlastním 1–2 investiční byty v ČR" },
                  { value: "expert", label: "Jsem zkušený investor s portfoliem v různých zemích" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`exp-${option.value}`} />
                    <Label htmlFor={`exp-${option.value}`} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Které trhy vás aktuálně nejvíce přitahují? (Možnost více odpovědí)
              </Label>
              <div className="space-y-3">
                {[
                  { value: "dubai", label: "Dubaj & SAE (0% daně, vysoký yield)" },
                  { value: "europe", label: "Evropa / Středomoří (Španělsko, Řecko – stabilita EU)" },
                  { value: "czech", label: "Česká republika (Praha/hory – známé prostředí)" },
                  { value: "exotic", label: "Exotika (Thajsko, Bali – vysoký spekulativní výnos)" },
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleMarketToggle(option.value)}
                    className={`flex items-center space-x-3 bg-card border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.markets.includes(option.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={formData.markets.includes(option.value)}
                      onCheckedChange={() => handleMarketToggle(option.value)}
                    />
                    <Label className="cursor-pointer flex-1">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                V jaké hladině plánujete realizovat svou příští akvizici?
              </Label>
              <RadioGroup
                value={formData.budgetRange}
                onValueChange={(value) => setFormData({ ...formData, budgetRange: value })}
                className="space-y-3"
              >
                {[
                  { value: "1-3m", label: "1 – 3 miliony Kč (vhodné pro Egypt, Thajsko)" },
                  { value: "3-7m", label: "3 – 7 milionů Kč (vhodné pro JVC Dubaj, menší byty v Řecku)" },
                  { value: "7-15m", label: "7 – 15 milionů Kč (vhodné pro Dubai Hills, apartmány v Praze)" },
                  { value: "15m+", label: "15 milionů Kč a více (luxusní vily, penthousy)" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                    <Label htmlFor={`budget-${option.value}`} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Preferujete financování z vlastních zdrojů, nebo bankovní pákou?
              </Label>
              <RadioGroup
                value={formData.financing}
                onValueChange={(value) => setFormData({ ...formData, financing: value })}
                className="space-y-3"
              >
                {[
                  { value: "own", label: "100% vlastní zdroje" },
                  { value: "mortgage", label: "Využití hypotéky v ČR (pokud je to u projektu možné)" },
                  { value: "developer", label: "Využití bezúročného splátkového kalendáře od developera" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`fin-${option.value}`} />
                    <Label htmlFor={`fin-${option.value}`} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Jaký je váš preferovaný investiční horizont?
              </Label>
              <RadioGroup
                value={formData.investmentHorizon}
                onValueChange={(value) => setFormData({ ...formData, investmentHorizon: value })}
                className="space-y-3"
              >
                {[
                  { value: "short", label: "Krátkodobý (spekulace, prodej před dokončením – 1-3 roky)" },
                  { value: "medium", label: "Střednědobý (držení 5–7 let)" },
                  { value: "long", label: "Dlouhodobý (generační majetek – 10 a více let)" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`horizon-${option.value}`} />
                    <Label htmlFor={`horizon-${option.value}`} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Kdy plánujete reálně alokovat prostředky do vybraného projektu?
              </Label>
              <RadioGroup
                value={formData.timeline}
                onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                className="space-y-3"
              >
                {[
                  { value: "immediate", label: "Ihned (mám připravenou hotovost)" },
                  { value: "3-6months", label: "V horizontu 3–6 měsíců" },
                  { value: "exploring", label: "Zatím pouze mapuji trh a hledám správnou příležitost" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`time-${option.value}`} />
                    <Label htmlFor={`time-${option.value}`} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Co je pro vás u nemovitosti nejdůležitější parametr? (Vyberte TOP 1)
              </Label>
              <RadioGroup
                value={formData.topPriority}
                onValueChange={(value) => setFormData({ ...formData, topPriority: value })}
                className="space-y-3"
              >
                {[
                  { value: "location", label: "Lokalita a prestižní adresa" },
                  { value: "developer", label: "Renomé a historie developera" },
                  { value: "payment", label: "Unikátní platební plán (např. splátky po předání)" },
                  { value: "design", label: "Design a kvalita vybavení" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`priority-${option.value}`} />
                    <Label htmlFor={`priority-${option.value}`} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Téměř hotovo!</strong> Vyplňte prosím vaše kontaktní údaje, abychom vás mohli kontaktovat s personalizovanou nabídkou.
              </p>
            </div>

            <div>
              <Label htmlFor="name" className="text-base font-semibold">
                Jméno a příjmení *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jan Novák"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-base font-semibold">
                E-mail *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jan@email.cz"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label className="text-base font-semibold">Telefon *</Label>
              <div className="mt-2">
                <PhoneInputWithValidation
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                  showWhatsAppValidation={true}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {!isComplete ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Vyberte termín konzultace
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Pondělí - Sobota, 10:00 - 18:00
                  </p>
                </div>

                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(""); // Reset time when date changes
                    }}
                    locale={cs}
                    disabled={(date) => {
                      const day = date.getDay();
                      // Disable Sunday (0) and past dates
                      return date < new Date(new Date().setHours(0, 0, 0, 0)) || day === 0;
                    }}
                    className="rounded-lg border border-border bg-card p-3 pointer-events-auto"
                  />
                </div>

                {selectedDate && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold text-center block">
                      Vyberte čas konzultace
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {availableHours.map((hour) => (
                        <Button
                          key={hour}
                          type="button"
                          variant={selectedTime === hour ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(hour)}
                          className="w-full"
                        >
                          {hour}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && selectedTime && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Vybraný termín:{" "}
                      <strong className="text-foreground">
                        {selectedDate.toLocaleDateString("cs-CZ", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        v {selectedTime}
                      </strong>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Děkujeme!
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Vaše data jsou u nás v bezpečí. Na základě odpovědí jsme vás zařadili do skupiny{" "}
                  <strong className="text-primary">"Kvalifikovaný investor"</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Brzy vás budeme kontaktovat s konkrétními projekty od Ellington, Azizi či Imtiaz.
                </p>
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-border">
      <CardHeader className="text-center border-b border-border pb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary uppercase tracking-wide">
            Supertip formulář
          </span>
        </div>
        <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
          Investorský profil 2026: Strategie na míru
        </CardTitle>
        <p className="text-muted-foreground mt-2">
          Vyplnění trvá 3 minuty. Na základě těchto údajů pro vás připravíme užší výběr projektů,
          které splňují vaše kritéria pro výnos a bezpečnost.
        </p>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    currentStep >= step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 text-center hidden md:block ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`hidden md:block absolute h-0.5 w-full top-5 left-1/2 -z-10 ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {!isComplete && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Zpět
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                Pokračovat
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? "Odesílám..." : "Dokončit a rezervovat"}
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
