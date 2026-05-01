import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Home, DollarSign, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z.string().min(6).max(72),
  propertyInfo: z.string().trim().max(1000).optional().or(z.literal("")),
});

interface BecomeHostDialogProps {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  children?: ReactNode;
}

export const BecomeHostDialog = ({ open, onOpenChange, children }: BecomeHostDialogProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, signInWithPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    propertyInfo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error, user: newUser } = await signUp(parsed.data.email, parsed.data.password);
      if (error) {
        setLoading(false);
        return;
      }
      if (newUser) {
        await supabase
          .from("profiles")
          .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
          .eq("id", newUser.id);
        await supabase
          .from("user_roles")
          .insert({ user_id: newUser.id, role: "host" as never });
      }

      // Ensure session is active so host can enter /host immediately
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await signInWithPassword(parsed.data.email, parsed.data.password);
      }

      toast.success(t("becomeHost.okCreated"));
      onOpenChange?.(false);
      navigate("/host");
    } catch (err) {
      console.error(err);
      toast.error(t("becomeHost.errGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: DollarSign, title: t("becomeHost.earnTitle"), desc: t("becomeHost.earnDesc") },
    { icon: Calendar, title: t("becomeHost.controlTitle"), desc: t("becomeHost.controlDesc") },
    { icon: Sparkles, title: t("becomeHost.superhostTitle"), desc: t("becomeHost.superhostDesc") },
    { icon: Home, title: t("becomeHost.easyTitle"), desc: t("becomeHost.easyDesc") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-background border-border">
        <div className="grid md:grid-cols-2">
          {/* Left — editorial dark panel */}
          <div className="bg-foreground text-background p-10 md:p-12 flex flex-col">
            <span className="text-xs uppercase tracking-[0.3em] text-background/60 mb-6 font-medium">
              — Hosting
            </span>
            <h2 className="editorial-headline text-3xl md:text-4xl lg:text-5xl mb-4 text-balance leading-[1.05]">
              {t("becomeHost.heroTitle")}
            </h2>
            <p className="text-sm md:text-base text-background/70 leading-relaxed font-light mb-10 max-w-md">
              {t("becomeHost.heroSubtitle")}
            </p>

            <div className="space-y-px bg-background/10 border border-background/10 mt-auto">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-foreground p-5 flex gap-4 items-start">
                  <Icon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    strokeWidth={1.25}
                    style={{ color: "hsl(var(--accent))" }}
                  />
                  <div>
                    <h3 className="font-serif text-base mb-1 leading-tight">{title}</h3>
                    <p className="text-xs text-background/60 leading-relaxed font-light">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form panel */}
          <div className="p-10 md:p-12 flex flex-col">
            <span className="editorial-eyebrow block mb-4">— Get started</span>
            <h3 className="editorial-headline text-2xl md:text-3xl text-foreground mb-2 leading-tight">
              {t("becomeHost.createAccount")}
            </h3>
            <p className="text-sm text-muted-foreground font-light mb-8">
              {t("becomeHost.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  onOpenChange?.(false);
                  navigate("/auth");
                }}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
                style={{ color: "hsl(var(--accent))" }}
              >
                {t("becomeHost.logIn")}
              </button>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bh-fullName" className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                  {t("becomeHost.fullName")}
                </Label>
                <Input
                  id="bh-fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11 rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bh-email" className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                  {t("becomeHost.email")}
                </Label>
                <Input
                  id="bh-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11 rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bh-phone" className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                  {t("becomeHost.phone")}
                </Label>
                <Input
                  id="bh-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={loading}
                  className="h-11 rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bh-password" className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                  {t("becomeHost.passwordLabel")}
                </Label>
                <Input
                  id="bh-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  disabled={loading}
                  className="h-11 rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bh-propertyInfo" className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                  {t("becomeHost.propertyInfo")}
                </Label>
                <Textarea
                  id="bh-propertyInfo"
                  placeholder={t("becomeHost.propertyInfoPh")}
                  value={form.propertyInfo}
                  onChange={(e) => setForm({ ...form, propertyInfo: e.target.value })}
                  rows={2}
                  disabled={loading}
                  className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-12 text-sm font-medium mt-6"
              >
                {loading ? t("becomeHost.creating") : t("becomeHost.submit")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center font-light pt-2">
                {t("becomeHost.afterSignup")}
              </p>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
