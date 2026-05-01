import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";
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
import { getAffiliateCode } from "@/utils/affiliateCode";
import { Mail, Phone } from "lucide-react";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name is too long"),
  email: z.string().trim().email("Invalid email").max(255, "Email is too long"),
  phone: z.string().trim().min(1, "Phone is required").max(20, "Phone is too long"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long"),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactDialogProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function ContactDialog({ children, onSuccess, open: openProp, onOpenChange }: ContactDialogProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    if (onOpenChange) onOpenChange(o); else setOpenState(o);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const affiliateCode = getAffiliateCode();
      console.log('[ContactDialog] Submitting with affiliate_code:', affiliateCode);

      const { data: response, error } = await supabase.functions.invoke("send-contact-message", {
        body: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          message: data.message,
          affiliate_code: affiliateCode || null,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to send message");
      }

      if (response?.error) {
        if (response.error.includes("Too many requests")) {
          toast.error("Too many attempts. Please try again later.");
        } else {
          throw new Error(response.error);
        }
        return;
      }

      toast.success("Thanks for your message! We'll be in touch soon.");
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting contact form:", error);
      toast.error("Failed to send the message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[560px] bg-background p-0 overflow-hidden border-border">
        {/* Editorial dark header */}
        <div className="bg-foreground text-background px-8 pt-10 pb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-background/60">— Get in touch</span>
          <DialogHeader className="mt-3 space-y-3 text-left">
            <DialogTitle className="editorial-headline text-3xl md:text-4xl text-background">
              Contact <span className="italic text-accent">us</span>
            </DialogTitle>
            <p className="text-sm font-light text-background/70 max-w-md">
              Tell us about your project and our team will get back to you shortly.
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-8 py-8">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
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
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
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
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your message..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </Button>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                asChild
              >
                <a href="tel:+50688888888">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                asChild
              >
                <a href="mailto:info@go2dubai.online">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
