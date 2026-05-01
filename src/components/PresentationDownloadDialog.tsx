import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";
import { FileText, Download, Building, TrendingUp } from "lucide-react";

interface PresentationDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PresentationDownloadDialog = ({ 
  open, 
  onOpenChange 
}: PresentationDownloadDialogProps) => {
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get('ref') || searchParams.get('affiliate') || searchParams.get('aff');
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    interest: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      interest: ""
    });
  };

  const triggerDownload = () => {
    const link = document.createElement('a');
    link.href = '/prezentace-produbai.pdf';
    link.download = 'PREZENTACE_PRODUBAI.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-brochure-notification', {
        body: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          selectedBrochures: ['Prezentace ProDubai'],
          investmentType: formData.interest,
          requestType: 'presentation_download',
          affiliateCode: affiliateCode || undefined,
        }
      });

      if (error) throw error;

      // Trigger download after successful submission
      triggerDownload();

      toast({
        title: "Děkujeme za váš zájem!",
        description: "Prezentace se stahuje. Brzy vás budeme kontaktovat.",
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Still trigger download even on notification error
      triggerDownload();
      toast({
        title: "Prezentace se stahuje",
        description: "Děkujeme za váš zájem!",
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-serif font-bold text-foreground mb-1">
                Prezentace ProDubai
              </h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  Investice v Dubaji
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Kompletní přehled
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  PDF ke stažení
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Vyplňte formulář a stáhněte si kompletní prezentaci s informacemi o investičních příležitostech v Dubaji.
          </p>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground font-medium">Jméno</Label>
              <Input
                id="firstName"
                placeholder="Jan"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground font-medium">Příjmení</Label>
              <Input
                id="lastName"
                placeholder="Novák"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="bg-secondary border-border"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Telefon</Label>
            <PhoneInputWithValidation
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              required
              showWhatsAppValidation={true}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jan@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-secondary border-border"
            />
          </div>

          {/* Interest */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Proč máte zájem?</Label>
            <Select
              value={formData.interest}
              onValueChange={(value) => setFormData({ ...formData, interest: value })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Vyberte důvod zájmu" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="investment">Investice</SelectItem>
                <SelectItem value="living">Bydlení</SelectItem>
                <SelectItem value="vacation">Dovolenkové bydlení</SelectItem>
                <SelectItem value="rental">Pronájem</SelectItem>
                <SelectItem value="cooperation">Spolupráce</SelectItem>
                <SelectItem value="other">Jiné</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit button */}
          <Button 
            type="submit" 
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
            size="lg"
            disabled={isSubmitting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isSubmitting ? "Připravuji stahování..." : "Stáhnout prezentaci zdarma"}
          </Button>

          {/* Privacy notice */}
          <p className="text-xs text-center text-muted-foreground">
            Odesláním souhlasíte se zpracováním osobních údajů. Vaše data jsou v bezpečí.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
