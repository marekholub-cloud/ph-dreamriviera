import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, User as UserIcon, Camera, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BecomeHostDialog } from "@/components/BecomeHostDialog";

const COPY = {
  en: {
    title: "Create your account",
    desc: "Choose how you want to use go2dubai.online",
    guest: "I'm a guest",
    guestDesc: "Book stays and discover villas in Dubai",
    host: "I'm a host",
    hostDesc: "List your property and welcome guests",
    back: "Back",
    formTitle: "Tell us about yourself",
    formDesc: "Create your guest profile",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    password: "Password (min. 6 characters)",
    phone: "Phone",
    address: "Address",
    bio: "Tell us something about yourself",
    photo: "Profile photo",
    upload: "Upload photo",
    submit: "Create account",
    submitting: "Creating account...",
    errPwLen: "Password must be at least 6 characters",
    errReq: "Please fill in all required fields",
    success: "Account created! Please check your email to verify.",
  },
  cs: {
    title: "Vytvořte si účet",
    desc: "Vyberte, jak chcete používat go2dubai.online",
    guest: "Jsem host",
    guestDesc: "Rezervujte si pobyty a objevujte vily v Kostarice",
    host: "Jsem hostitel",
    hostDesc: "Nabídněte svou nemovitost a přivítejte hosty",
    back: "Zpět",
    formTitle: "Řekněte nám o sobě",
    formDesc: "Vytvořte si profil hosta",
    firstName: "Jméno",
    lastName: "Příjmení",
    email: "E-mail",
    password: "Heslo (min. 6 znaků)",
    phone: "Telefon",
    address: "Adresa",
    bio: "Řekněte nám něco o sobě",
    photo: "Profilová fotografie",
    upload: "Nahrát fotografii",
    submit: "Vytvořit účet",
    submitting: "Vytvářím účet...",
    errPwLen: "Heslo musí mít alespoň 6 znaků",
    errReq: "Vyplňte prosím všechna povinná pole",
    success: "Účet vytvořen! Zkontrolujte e-mail pro ověření.",
  },
  es: {
    title: "Crea tu cuenta",
    desc: "Elige cómo quieres usar go2dubai.online",
    guest: "Soy huésped",
    guestDesc: "Reserva estancias y descubre villas en Dubai",
    host: "Soy anfitrión",
    hostDesc: "Publica tu propiedad y recibe huéspedes",
    back: "Atrás",
    formTitle: "Cuéntanos sobre ti",
    formDesc: "Crea tu perfil de huésped",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo electrónico",
    password: "Contraseña (mín. 6 caracteres)",
    phone: "Teléfono",
    address: "Dirección",
    bio: "Cuéntanos algo sobre ti",
    photo: "Foto de perfil",
    upload: "Subir foto",
    submit: "Crear cuenta",
    submitting: "Creando cuenta...",
    errPwLen: "La contraseña debe tener al menos 6 caracteres",
    errReq: "Por favor complete todos los campos obligatorios",
    success: "¡Cuenta creada! Revise su correo para verificar.",
  },
} as const;

type Step = "choose" | "guest-form";

interface RegisterDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const RegisterDialog = ({ children, open: openProp, onOpenChange }: RegisterDialogProps) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (["en", "cs", "es"].includes(i18n.language) ? i18n.language : "en") as keyof typeof COPY;
  const c = COPY[lang];

  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    if (onOpenChange) onOpenChange(o);
    else setOpenState(o);
  };
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [openHost, setOpenHost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    bio: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const reset = () => {
    setStep("choose");
    setForm({ firstName: "", lastName: "", email: "", password: "", phone: "", address: "", bio: "" });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(reset, 300);
  };

  const handleHostChoice = () => {
    setOpen(false);
    setTimeout(() => setOpenHost(true), 200);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5 MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error(c.errReq);
      return;
    }
    if (form.password.length < 6) {
      toast.error(c.errPwLen);
      return;
    }

    setLoading(true);
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      let avatarUrl: string | null = null;

      if (userId && avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${userId}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = pub.publicUrl;
        }
      }

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            phone: form.phone || null,
            address: form.address || null,
            bio: form.bio || null,
            avatar_url: avatarUrl,
          })
          .eq("id", userId);
      }

      toast.success(c.success);
      handleClose(false);
    } catch (err: any) {
      toast.error(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      {children && <div onClick={() => setOpen(true)} className="contents">{children}</div>}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 bg-background border-border">
        {step === "choose" ? (
          <>
            {/* Editorial dark header */}
            <div className="bg-foreground text-background px-8 pt-10 pb-8">
              <span className="text-[10px] uppercase tracking-[0.3em] text-background/60">— Welcome</span>
              <DialogHeader className="mt-3 space-y-3 text-left">
                <DialogTitle className="editorial-headline text-3xl md:text-4xl text-background">
                  Create your <span className="italic text-accent">account</span>
                </DialogTitle>
                <DialogDescription className="text-sm font-light text-background/70 max-w-md">
                  {c.desc}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-4 px-8 py-8">
              <button
                onClick={() => setStep("guest-form")}
                className="group flex items-start gap-4 p-5 border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-left"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors shrink-0">
                  <UserIcon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="font-serif text-lg text-foreground">{c.guest}</div>
                  <div className="text-sm text-muted-foreground mt-1 font-light">{c.guestDesc}</div>
                </div>
              </button>
              <button
                onClick={handleHostChoice}
                className="group flex items-start gap-4 p-5 border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-left"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors shrink-0">
                  <Home className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="font-serif text-lg text-foreground">{c.host}</div>
                  <div className="text-sm text-muted-foreground mt-1 font-light">{c.hostDesc}</div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Editorial dark header */}
            <div className="bg-foreground text-background px-8 pt-10 pb-8 relative">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="absolute left-6 top-6 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-background/60 hover:text-accent transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                {c.back}
              </button>
              <span className="text-[10px] uppercase tracking-[0.3em] text-background/60 block mt-6">— Profile</span>
              <DialogHeader className="mt-3 space-y-3 text-left">
                <DialogTitle className="editorial-headline text-3xl md:text-4xl text-background">
                  {c.formTitle.split(" ").slice(0, -1).join(" ")} <span className="italic text-accent">{c.formTitle.split(" ").slice(-1)}</span>
                </DialogTitle>
                <DialogDescription className="text-sm font-light text-background/70">{c.formDesc}</DialogDescription>
              </DialogHeader>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-8 py-8">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {avatarPreview && <AvatarImage src={avatarPreview} alt="avatar" />}
                  <AvatarFallback className="bg-muted">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {c.upload}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{c.firstName} *</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{c.lastName} *</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">{c.email} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  maxLength={255}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{c.password} *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">{c.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={30}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">{c.address}</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  maxLength={255}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">{c.bio}</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {c.submitting}
                  </>
                ) : (
                  c.submit
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
    <BecomeHostDialog open={openHost} onOpenChange={setOpenHost} />
    </>
  );
};
