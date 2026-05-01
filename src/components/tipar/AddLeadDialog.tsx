import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";
import { UserPlus, Star, Trophy } from "lucide-react";

const personalLeadSchema = z.object({
  lead_name: z.string().min(2, "Jméno musí mít alespoň 2 znaky").max(100),
  email: z.string().email("Neplatný e-mail").max(255).optional().or(z.literal("")),
  phone: z.string().min(9, "Zadejte platné telefonní číslo"),
  budget: z.string().min(1, "Vyberte rozpočet"),
  preferred_contact_time: z.string().min(1, "Vyberte čas kontaktování"),
  preferred_communication_channel: z.string().min(1, "Vyberte způsob komunikace"),
  notes: z.string().max(500).optional(),
});

const supertipLeadSchema = personalLeadSchema.extend({
  investment_goals: z.string().min(1, "Popište investiční cíle"),
  investment_timeline: z.string().min(1, "Vyberte časový horizont"),
  property_value: z.string().optional(),
  webinar_registered: z.boolean().optional(),
});

type PersonalLeadData = z.infer<typeof personalLeadSchema>;
type SupertipLeadData = z.infer<typeof supertipLeadSchema>;

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddLeadDialog = ({ open, onOpenChange, onSuccess }: AddLeadDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"personal" | "supertip">("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personalForm = useForm<PersonalLeadData>({
    resolver: zodResolver(personalLeadSchema),
    defaultValues: {
      lead_name: "",
      email: "",
      phone: "",
      budget: "",
      preferred_contact_time: "",
      preferred_communication_channel: "",
      notes: "",
    },
  });

  const supertipForm = useForm<SupertipLeadData>({
    resolver: zodResolver(supertipLeadSchema),
    defaultValues: {
      lead_name: "",
      email: "",
      phone: "",
      budget: "",
      preferred_contact_time: "",
      preferred_communication_channel: "",
      investment_goals: "",
      investment_timeline: "",
      property_value: "",
      webinar_registered: false,
      notes: "",
    },
  });

  const onSubmitPersonal = async (data: PersonalLeadData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Level 2: Personal recommendation - 75% warmth, lead status
      const { data: insertedLead, error } = await supabase.from("leads").insert({
        referrer_id: user.id,
        referred_by: user.id,
        lead_name: data.lead_name,
        email: data.email || null,
        phone: data.phone,
        status: "lead",
        warmth_level: 75,
        lead_level: 2,
        budget: data.budget,
        preferred_contact_time: data.preferred_contact_time,
        preferred_communication_channel: data.preferred_communication_channel,
        notes: data.notes || null,
        commission_rate: 0.0075, // 1% * 0.75 coefficient
        source_form: "tipar_personal",
      }).select("id").single();

      if (error) throw error;

      // Sync to WLM
      try {
        const { error: wlmError } = await supabase.functions.invoke("send-lead-to-wlm", {
          body: { lead_id: insertedLead.id }
        });
        
        if (wlmError) {
          console.error("WLM sync failed:", wlmError);
        } else {
          console.log("Lead synced to WLM successfully");
        }
      } catch (wlmErr) {
        console.error("WLM sync error:", wlmErr);
      }

      toast({
        title: "Lead přidán!",
        description: "Osobní doporučení (Level 2) bylo úspěšně zaregistrováno. Provize: 0.75%",
      });

      personalForm.reset();
      onSuccess();
    } catch (error) {
      console.error("Error adding lead:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat lead.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitSupertip = async (data: SupertipLeadData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const propertyValue = data.property_value 
        ? parseFloat(data.property_value.replace(/\s/g, "")) 
        : null;

      // Level 3: Supertip - 100% warmth, qualified status
      // Commission is only paid if seminar_accepted OR questionnaire_completed_independently
      const { data: insertedLead, error } = await supabase.from("leads").insert({
        referrer_id: user.id,
        referred_by: user.id,
        lead_name: data.lead_name,
        email: data.email || null,
        phone: data.phone,
        status: "qualified",
        warmth_level: 100,
        lead_level: 3,
        budget: data.budget,
        preferred_contact_time: data.preferred_contact_time,
        preferred_communication_channel: data.preferred_communication_channel,
        investment_goals: data.investment_goals,
        investment_timeline: data.investment_timeline,
        property_value: propertyValue,
        webinar_registered: data.webinar_registered || false,
        seminar_accepted: data.webinar_registered || false, // Track if they accepted seminar
        questionnaire_completed_independently: true, // Filled via tipar dashboard = independently
        notes: data.notes || null,
        commission_rate: 0.01, // 1% * 1.0 coefficient
        source_form: "tipar_supertip",
      }).select("id").single();

      if (error) throw error;

      // Sync to WLM
      try {
        const { error: wlmError } = await supabase.functions.invoke("send-lead-to-wlm", {
          body: { lead_id: insertedLead.id }
        });
        
        if (wlmError) {
          console.error("WLM sync failed:", wlmError);
        } else {
          console.log("Lead synced to WLM successfully");
        }
      } catch (wlmErr) {
        console.error("WLM sync error:", wlmErr);
      }

      toast({
        title: "Supertip přidán!",
        description: "Kvalifikovaný investor (Level 3) byl úspěšně zaregistrován. Provize: 1%",
      });

      supertipForm.reset();
      onSuccess();
    } catch (error) {
      console.error("Error adding lead:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat lead.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Přidat nový lead
          </DialogTitle>
          <DialogDescription>
            Zadejte údaje o potenciálním klientovi
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "personal" | "supertip")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Osobní (75%)
            </TabsTrigger>
            <TabsTrigger value="supertip" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Supertip (100%)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            <Form {...personalForm}>
              <form onSubmit={personalForm.handleSubmit(onSubmitPersonal)} className="space-y-4">
                <FormField
                  control={personalForm.control}
                  name="lead_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno a příjmení *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan Novák" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={personalForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jan@email.cz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={personalForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon *</FormLabel>
                        <FormControl>
                          <PhoneInputWithValidation
                            value={field.value}
                            onChange={field.onChange}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={personalForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rozpočet *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte rozpočet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="do-5m">Do 5 mil. Kč</SelectItem>
                          <SelectItem value="5m-10m">5 - 10 mil. Kč</SelectItem>
                          <SelectItem value="10m-20m">10 - 20 mil. Kč</SelectItem>
                          <SelectItem value="20m-50m">20 - 50 mil. Kč</SelectItem>
                          <SelectItem value="nad-50m">Nad 50 mil. Kč</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalForm.control}
                  name="preferred_contact_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferovaný čas kontaktování *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte čas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rano">Ráno (8:00 - 12:00)</SelectItem>
                          <SelectItem value="odpoledne">Odpoledne (12:00 - 17:00)</SelectItem>
                          <SelectItem value="vecer">Večer (17:00 - 20:00)</SelectItem>
                          <SelectItem value="kdykoliv">Kdykoliv</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalForm.control}
                  name="preferred_communication_channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferovaný způsob komunikace *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte způsob" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="telefon">Telefon</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="osobni">Osobní schůzka</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámky</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Další informace o klientovi..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Ukládám..." : "Přidat osobní doporučení"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="supertip" className="mt-4">
            <Form {...supertipForm}>
              <form onSubmit={supertipForm.handleSubmit(onSubmitSupertip)} className="space-y-4">
                <FormField
                  control={supertipForm.control}
                  name="lead_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno a příjmení *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan Novák" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={supertipForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jan@email.cz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supertipForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon *</FormLabel>
                        <FormControl>
                          <PhoneInputWithValidation
                            value={field.value}
                            onChange={field.onChange}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={supertipForm.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rozpočet *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte rozpočet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="do-5m">Do 5 mil. Kč</SelectItem>
                            <SelectItem value="5m-10m">5 - 10 mil. Kč</SelectItem>
                            <SelectItem value="10m-20m">10 - 20 mil. Kč</SelectItem>
                            <SelectItem value="20m-50m">20 - 50 mil. Kč</SelectItem>
                            <SelectItem value="nad-50m">Nad 50 mil. Kč</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supertipForm.control}
                    name="property_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odhadovaná hodnota (Kč)</FormLabel>
                        <FormControl>
                          <Input placeholder="10 000 000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={supertipForm.control}
                  name="investment_goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investiční cíle *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Popište investiční záměry klienta..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={supertipForm.control}
                  name="investment_timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Časový horizont investice *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte horizont" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ihned">Ihned</SelectItem>
                          <SelectItem value="1-3-mesice">1-3 měsíce</SelectItem>
                          <SelectItem value="3-6-mesicu">3-6 měsíců</SelectItem>
                          <SelectItem value="6-12-mesicu">6-12 měsíců</SelectItem>
                          <SelectItem value="vice-nez-rok">Více než rok</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={supertipForm.control}
                    name="preferred_contact_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Čas kontaktování *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte čas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rano">Ráno</SelectItem>
                            <SelectItem value="odpoledne">Odpoledne</SelectItem>
                            <SelectItem value="vecer">Večer</SelectItem>
                            <SelectItem value="kdykoliv">Kdykoliv</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supertipForm.control}
                    name="preferred_communication_channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Způsob komunikace *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte způsob" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="telefon">Telefon</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="osobni">Osobní</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={supertipForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámky</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Další informace o investorovi..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Ukládám..." : "Přidat Supertip (1% provize)"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};