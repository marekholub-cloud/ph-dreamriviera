import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Building, MapPin, Calendar } from "lucide-react";

const catalogSchema = z.object({
  firstName: z.string().trim().min(1, "Jméno je povinné").max(50, "Jméno je příliš dlouhé"),
  lastName: z.string().trim().min(1, "Příjmení je povinné").max(50, "Příjmení je příliš dlouhé"),
  email: z.string().trim().email("Neplatný email").max(255, "Email je příliš dlouhý"),
  phone: z.string().trim().min(1, "Telefon je povinný").max(20, "Telefon je příliš dlouhý"),
  interest: z.string().min(1, "Vyberte důvod zájmu"),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

interface Property {
  id: string;
  name: string;
  developer: string;
  location: string;
  priceFormatted: string;
  handover?: string;
  paymentPlan?: string;
  catalogUrl?: string;
}

interface CatalogDownloadDialogProps {
  children: React.ReactNode;
  property: Property;
}

const interestOptions = [
  { value: "investment", label: "Investice s výnosem" },
  { value: "vacation-home", label: "Rekreační bydlení" },
  { value: "relocation", label: "Plánuji se přestěhovat" },
  { value: "golden-visa", label: "Zájem o Golden Visa" },
  { value: "just-exploring", label: "Jen prozkoumávám možnosti" },
];

export function CatalogDownloadDialog({ children, property }: CatalogDownloadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get('ref') || searchParams.get('affiliate') || searchParams.get('aff');

  const form = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      interest: "",
    },
  });

  const onSubmit = async (data: CatalogFormData) => {
    setIsSubmitting(true);
    try {
      // Save to database via edge function (secure server-side insert)
      const { error } = await supabase.functions.invoke('submit-catalog-request', {
        body: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          investmentType: data.interest,
          propertyId: property.id,
          requestType: "brochure",
          affiliateCode: affiliateCode || undefined,
        }
      });

      if (error) throw error;

      // If there's a catalog URL, trigger download
      if (property.catalogUrl) {
        const link = document.createElement('a');
        link.href = property.catalogUrl;
        link.download = `${property.name.replace(/\s+/g, '-').toLowerCase()}-katalog.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success("Děkujeme! Katalog se stahuje. Brzy Vás budeme kontaktovat.");
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error submitting catalog request:", error);
      toast.error("Nepodařilo se odeslat požadavek. Zkuste to prosím znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-background p-0 overflow-hidden">
        {/* Property Header */}
        <div className="bg-card p-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-serif mb-1">
                {property.name}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="w-4 h-4" />
                <span>{property.developer}</span>
                <span className="text-border">•</span>
                <MapPin className="w-4 h-4" />
                <span>{property.location}</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-primary font-bold">{property.priceFormatted}</span>
                {property.handover && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{property.handover}</span>
                  </div>
                )}
                {property.paymentPlan && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {property.paymentPlan}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-6">
            Vyplňte formulář a stáhněte si kompletní katalog projektu s detailními informacemi o cenách, dispozicích a platebních podmínkách.
          </p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Příjmení</FormLabel>
                      <FormControl>
                        <Input placeholder="Novák" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <PhoneInputWithValidation
                        value={field.value}
                        onChange={field.onChange}
                        showWhatsAppValidation={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jan@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proč máte zájem?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte důvod zájmu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {interestOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Odesílám..."
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Stáhnout katalog zdarma
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Odesláním souhlasíte se zpracováním osobních údajů. Vaše data jsou v bezpečí.
              </p>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
