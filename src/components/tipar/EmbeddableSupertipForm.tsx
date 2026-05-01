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
} from "lucide-react";
import { cs } from "date-fns/locale";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";

interface EmbeddableSupertipFormProps {
  affiliateCode: string;
  onComplete?: () => void;
  hideProgress?: boolean;
  theme?: "light" | "dark";
}

const STEPS = [
  { id: 1, title: "Investiční filozofie", icon: Target },
  { id: 2, title: "Kapitál a lokality", icon: Globe },
  { id: 3, title: "Časový horizont", icon: Clock },
  { id: 4, title: "Kontaktní údaje", icon: User },
  { id: 5, title: "Rezervace hovoru", icon: CalendarDays },
];

export const EmbeddableSupertipForm = ({ 
  affiliateCode, 
  onComplete,
  hideProgress = false,
}: EmbeddableSupertipFormProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Available hours for consultation (10:00-18:00)
  const availableHours = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  const [formData, setFormData] = useState({
    primaryGoal: "",
    experience: "",
    markets: [] as string[],
    budgetRange: "",
    financing: "",
    investmentHorizon: "",
    timeline: "",
    topPriority: "",
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

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    // Create full datetime with selected time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const consultationDateTime = new Date(selectedDate);
    consultationDateTime.setHours(hours, minutes, 0, 0);

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('embed-investor-form', {
        body: {
          affiliateCode,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          preferredContactTime: consultationDateTime.toISOString(),
          consultationSlotType: 'ADMIN_RESERVE', // Mark as admin reserve slot
          primaryGoal: formData.primaryGoal,
          experience: formData.experience,
          markets: formData.markets,
          budgetRange: formData.budgetRange,
          financing: formData.financing,
          investmentHorizon: formData.investmentHorizon,
          timeline: formData.timeline,
          topPriority: formData.topPriority,
        },
      });

      if (error) throw error;

      setIsComplete(true);

      // Send postMessage to parent window
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'INVESTOR_FORM_COMPLETE',
          success: true,
          leadId: data?.leadId,
        }, '*');
      }

      toast({
        title: "Formulář odeslán!",
        description: "Brzy vás budeme kontaktovat. Děkujeme za váš zájem o investice.",
      });

      onComplete?.();
    } catch (error) {
      console.error("Error submitting form:", error);

      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'INVESTOR_FORM_ERROR',
          success: false,
          error: 'Failed to submit form',
        }, '*');
      }

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
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="cursor-pointer flex-1 text-sm">
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
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`exp-${option.value}`} />
                    <Label htmlFor={`exp-${option.value}`} className="cursor-pointer flex-1 text-sm">
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
                Které trhy vás aktuálně nejvíce přitahují?
              </Label>
              <div className="space-y-3">
                {[
                  { value: "dubai", label: "Dubaj & SAE (0% daně, vysoký yield)" },
                  { value: "europe", label: "Evropa / Středomoří (Španělsko, Řecko)" },
                  { value: "czech", label: "Česká republika (Praha/hory)" },
                  { value: "exotic", label: "Exotika (Thajsko, Bali)" },
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleMarketToggle(option.value)}
                    className={`flex items-center space-x-3 bg-card border rounded-lg p-3 cursor-pointer transition-colors ${
                      formData.markets.includes(option.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={formData.markets.includes(option.value)}
                      onCheckedChange={() => handleMarketToggle(option.value)}
                    />
                    <Label className="cursor-pointer flex-1 text-sm">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                V jaké hladině plánujete realizovat akvizici?
              </Label>
              <RadioGroup
                value={formData.budgetRange}
                onValueChange={(value) => setFormData({ ...formData, budgetRange: value })}
                className="space-y-3"
              >
                {[
                  { value: "1-3m", label: "1 – 3 miliony Kč" },
                  { value: "3-7m", label: "3 – 7 milionů Kč" },
                  { value: "7-15m", label: "7 – 15 milionů Kč" },
                  { value: "15m+", label: "15 milionů Kč a více" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                    <Label htmlFor={`budget-${option.value}`} className="cursor-pointer flex-1 text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Preferujete financování?
              </Label>
              <RadioGroup
                value={formData.financing}
                onValueChange={(value) => setFormData({ ...formData, financing: value })}
                className="space-y-3"
              >
                {[
                  { value: "own", label: "100% vlastní zdroje" },
                  { value: "mortgage", label: "Využití hypotéky" },
                  { value: "developer", label: "Splátkový kalendář od developera" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`fin-${option.value}`} />
                    <Label htmlFor={`fin-${option.value}`} className="cursor-pointer flex-1 text-sm">
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
                  { value: "short", label: "Krátkodobý (1-3 roky)" },
                  { value: "medium", label: "Střednědobý (5–7 let)" },
                  { value: "long", label: "Dlouhodobý (10+ let)" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`horizon-${option.value}`} />
                    <Label htmlFor={`horizon-${option.value}`} className="cursor-pointer flex-1 text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Kdy plánujete alokovat prostředky?
              </Label>
              <RadioGroup
                value={formData.timeline}
                onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                className="space-y-3"
              >
                {[
                  { value: "immediate", label: "Ihned (mám připravenou hotovost)" },
                  { value: "3-6months", label: "V horizontu 3–6 měsíců" },
                  { value: "exploring", label: "Zatím pouze mapuji trh" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`time-${option.value}`} />
                    <Label htmlFor={`time-${option.value}`} className="cursor-pointer flex-1 text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold text-foreground mb-4 block">
                Co je pro vás nejdůležitější?
              </Label>
              <RadioGroup
                value={formData.topPriority}
                onValueChange={(value) => setFormData({ ...formData, topPriority: value })}
                className="space-y-3"
              >
                {[
                  { value: "location", label: "Lokalita a prestižní adresa" },
                  { value: "developer", label: "Renomé developera" },
                  { value: "payment", label: "Unikátní platební plán" },
                  { value: "design", label: "Design a kvalita vybavení" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option.value} id={`priority-${option.value}`} />
                    <Label htmlFor={`priority-${option.value}`} className="cursor-pointer flex-1 text-sm">
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
          <div className="space-y-5">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Téměř hotovo!</strong> Vyplňte kontaktní údaje.
              </p>
            </div>

            <div>
              <Label htmlFor="name" className="text-sm font-semibold">
                Jméno a příjmení *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jan Novák"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-semibold">
                E-mail *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jan@email.cz"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-semibold">
                Telefon *
              </Label>
              <div className="mt-2">
                <PhoneInputWithValidation
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Vyberte termín konzultace
              </h3>
              <p className="text-sm text-muted-foreground">
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
                className="rounded-md border pointer-events-auto"
              />
            </div>

            {selectedDate && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-center block">
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
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-sm">
                  Vybraný termín:{" "}
                  <strong>
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
          </div>
        );

      default:
        return null;
    }
  };

  if (isComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-0 shadow-none bg-transparent">
        <CardContent className="pt-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Děkujeme za vyplnění!
            </h2>
            <p className="text-muted-foreground text-sm">
              Náš tým vás bude brzy kontaktovat s personalizovanou nabídkou.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-none bg-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Dotazník investora
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Progress Steps */}
        {!hideProgress && (
          <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index < STEPS.length - 1 ? "flex-1" : ""
                  }`}
                >
                  <div className="flex items-center w-full">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-1 ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 text-center hidden sm:block ${
                      isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Zpět
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Pokračovat
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? "Odesílám..." : "Odeslat dotazník"}
              {!isSubmitting && <CheckCircle2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
