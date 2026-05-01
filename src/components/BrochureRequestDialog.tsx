import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppCheckbox } from "@/components/WhatsAppCheckbox";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";

import laPerlaCard from "@/assets/laperla-card.jpg";
import oasisDeCoco from "@/assets/oasis-de-coco.jpg";
import oceanViewsSanMiguel from "@/assets/ocean-views-san-miguel.jpg";
import villaParkSandalo from "@/assets/villa-park-sandalo.jpg";
import katalogVil from "@/assets/katalog-vil.jpg";
import tropicalGardens from "@/assets/tropical-gardens.jpg";

const projects = [
  { id: "laperla", name: "La Perla Beach Front Resort", image: laPerlaCard },
  { id: "oceanviews", name: "Ocean Views San Miguel", image: oceanViewsSanMiguel },
  { id: "villapark", name: "Villa Park Sandalo", image: villaParkSandalo },
  { id: "oasis", name: "Oasis de Coco", image: oasisDeCoco },
  { id: "tropical", name: "Tropical Gardens", image: tropicalGardens },
  { id: "catalog", name: "Katalog vzorových vil", image: katalogVil }
];

interface BrochureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestType?: string;
}

export const BrochureRequestDialog = ({ 
  open, 
  onOpenChange, 
  requestType = 'brochure' 
}: BrochureRequestDialogProps) => {
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get('ref') || searchParams.get('affiliate') || searchParams.get('aff');
  
  const [brochureForm, setBrochureForm] = useState({
    name: "",
    email: "",
    phone: "",
    selectedBrochures: [] as string[],
    investmentType: "",
    budget: "",
    timeline: "",
    sendWhatsApp: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const toggleBrochure = (brochureId: string) => {
    setBrochureForm(prev => ({
      ...prev,
      selectedBrochures: prev.selectedBrochures.includes(brochureId)
        ? prev.selectedBrochures.filter(id => id !== brochureId)
        : [...prev.selectedBrochures, brochureId]
    }));
  };

  const resetForm = () => {
    setBrochureForm({
      name: "",
      email: "",
      phone: "",
      selectedBrochures: [],
      investmentType: "",
      budget: "",
      timeline: "",
      sendWhatsApp: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (brochureForm.selectedBrochures.length === 0) {
      toast({
        title: "Vyberte alespoň jednu brožuru",
        description: "Prosím označte projekty, o které máte zájem.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-brochure-notification', {
        body: {
          name: brochureForm.name,
          email: brochureForm.email,
          phone: brochureForm.phone,
          selectedBrochures: brochureForm.selectedBrochures,
          investmentType: brochureForm.investmentType,
          budget: brochureForm.budget,
          timeline: brochureForm.timeline,
          requestType: requestType,
          whatsappOptIn: brochureForm.sendWhatsApp,
          affiliateCode: affiliateCode || undefined,
        }
      });

      if (error) throw error;

      // Determine toast message based on WhatsApp status
      let description = `Vybrané brožury vám co nejdříve zašleme na email ${brochureForm.email}.`;
      
      if (brochureForm.sendWhatsApp) {
        if (data?.whatsappSent) {
          description = `Brožury jsme vám zaslali na email ${brochureForm.email} a také přes WhatsApp.`;
        } else if (data?.whatsappError) {
          description = `Brožury jsme vám zaslali na email ${brochureForm.email}. WhatsApp zprávu se nepodařilo doručit – možná je potřeba nejprve aktivovat spojení (viz instrukce ve formuláři).`;
        }
      }

      toast({
        title: "Děkujeme za váš zájem!",
        description,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting brochure form:', error);
      toast({
        title: "Chyba při odesílání",
        description: "Zkuste to prosím znovu nebo nás kontaktujte přímo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-bold text-foreground">
            Vyžádejte si brožury projektů
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Výběr brožur */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Vyberte projekty, které vás zajímají:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    brochureForm.selectedBrochures.includes(project.id)
                      ? "border-accent shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => toggleBrochure(project.id)}
                >
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={brochureForm.selectedBrochures.includes(project.id)}
                      onCheckedChange={() => toggleBrochure(project.id)}
                      className="bg-white border-2"
                    />
                  </div>
                  <div className="p-2 bg-secondary">
                    <p className="text-xs font-medium text-foreground text-center">{project.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Osobní údaje */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Osobní údaje:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Jméno a příjmení"
                value={brochureForm.name}
                onChange={(e) => setBrochureForm({ ...brochureForm, name: e.target.value })}
                required
                className="bg-secondary border-border text-foreground"
              />
              <Input
                type="email"
                placeholder="Email"
                value={brochureForm.email}
                onChange={(e) => setBrochureForm({ ...brochureForm, email: e.target.value })}
                required
                className="bg-secondary border-border text-foreground"
              />
              <PhoneInputWithValidation
                value={brochureForm.phone}
                onChange={(value) => setBrochureForm({ ...brochureForm, phone: value })}
                required
                className="bg-secondary border-border text-foreground"
                showWhatsAppValidation={brochureForm.sendWhatsApp}
              />
            </div>
          </div>

          {/* Investiční preference */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Investiční preference:</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Typ investice</label>
                <Select
                  value={brochureForm.investmentType}
                  onValueChange={(value) => setBrochureForm({ ...brochureForm, investmentType: value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Vyberte typ" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem key="pozemek" value="pozemek">Pozemek</SelectItem>
                    <SelectItem key="villa" value="villa">Vila / Dům</SelectItem>
                    <SelectItem key="apartman" value="apartman">Apartmán</SelectItem>
                    <SelectItem key="komercni" value="komercni">Komerční nemovitost</SelectItem>
                    <SelectItem key="nevim" value="nevim">Ještě nevím</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Rozpočet (USD)</label>
                <Select
                  value={brochureForm.budget}
                  onValueChange={(value) => setBrochureForm({ ...brochureForm, budget: value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Vyberte rozpočet" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem key="do-100k" value="do-100k">Do $100,000</SelectItem>
                    <SelectItem key="100k-250k" value="100k-250k">$100,000 - $250,000</SelectItem>
                    <SelectItem key="250k-500k" value="250k-500k">$250,000 - $500,000</SelectItem>
                    <SelectItem key="500k-1m" value="500k-1m">$500,000 - $1,000,000</SelectItem>
                    <SelectItem key="nad-1m" value="nad-1m">Nad $1,000,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Časový horizont</label>
                <Select
                  value={brochureForm.timeline}
                  onValueChange={(value) => setBrochureForm({ ...brochureForm, timeline: value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Kdy plánujete investovat" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem key="okamzite" value="okamzite">Okamžitě</SelectItem>
                    <SelectItem key="3-mesice" value="3-mesice">Do 3 měsíců</SelectItem>
                    <SelectItem key="6-mesicu" value="6-mesicu">Do 6 měsíců</SelectItem>
                    <SelectItem key="rok" value="rok">Do 1 roku</SelectItem>
                    <SelectItem key="delsi" value="delsi">Delší než 1 rok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <WhatsAppCheckbox
            checked={brochureForm.sendWhatsApp}
            onCheckedChange={(checked) => setBrochureForm({ ...brochureForm, sendWhatsApp: checked })}
          />

          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
            {isSubmitting ? "Odesílám..." : "Odeslat žádost o brožury"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
