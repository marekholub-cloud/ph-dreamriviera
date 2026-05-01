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
import { FileText, Building, MapPin, Calendar, Download } from "lucide-react";

interface PropertyBrochureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    name: string;
    developer: string;
    location: string;
    priceFormatted: string;
    handover?: string;
    paymentPlan?: string;
    catalogUrl?: string;
  };
}

export const PropertyBrochureDialog = ({ 
  open, 
  onOpenChange, 
  property 
}: PropertyBrochureDialogProps) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('submit-catalog-request', {
        body: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          phone: formData.phone,
          investmentType: formData.interest,
          propertyId: property.id,
          requestType: "brochure",
          affiliateCode: affiliateCode || undefined,
        },
      });

      if (error) throw error;

      if (property.catalogUrl) {
        const link = document.createElement('a');
        link.href = property.catalogUrl;
        link.download = `${property.name.replace(/\s+/g, '-').toLowerCase()}-brochure.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Thank you for your interest!",
        description: property.catalogUrl
          ? "Your brochure is downloading. We'll be in touch shortly."
          : `We've received your request. We'll get back to you at ${formData.email}.`,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Submission error",
        description: "Please try again or contact us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 overflow-hidden">
        {/* Header with property info */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-serif font-bold text-foreground mb-1">
                {property.name}
              </h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {property.developer}
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {property.location}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-accent font-bold">
                  {property.priceFormatted}
                </span>
                {property.handover && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {property.handover}
                  </span>
                )}
                {property.paymentPlan && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {property.paymentPlan}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Fill in the form and download the complete project catalog with detailed information on prices, layouts, and payment plans.
          </p>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground font-medium">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground font-medium">Last name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="bg-secondary border-border"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Phone</Label>
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
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-secondary border-border"
            />
          </div>

          {/* Interest */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Why are you interested?</Label>
            <Select
              value={formData.interest}
              onValueChange={(value) => setFormData({ ...formData, interest: value })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select reason for interest" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="living">Living</SelectItem>
                <SelectItem value="vacation">Vacation home</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
            {isSubmitting ? "Sending..." : "Download catalog for free"}
          </Button>

          {/* Privacy notice */}
          <p className="text-xs text-center text-muted-foreground">
            By submitting you agree to the processing of personal data. Your data is safe.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
