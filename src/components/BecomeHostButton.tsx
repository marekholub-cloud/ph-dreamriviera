import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BecomeHostDialog } from "@/components/BecomeHostDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Shield } from "lucide-react";

const COPY = {
  en: {
    hostTitle: "You are already a host",
    hostDesc: "You can manage your properties and reservations in the host dashboard.",
    hostCta: "Go to host dashboard",
    adminTitle: "You are signed in as administrator",
    adminDesc: "Manage the platform from the admin panel.",
    adminCta: "Go to admin panel",
    cancel: "Close",
  },
  cs: {
    hostTitle: "Již jste hostitelem",
    hostDesc: "Své nemovitosti a rezervace můžete spravovat v administraci hostitele.",
    hostCta: "Přejít do administrace hostitele",
    adminTitle: "Jste přihlášen jako administrátor",
    adminDesc: "Spravujte platformu z administrátorského panelu.",
    adminCta: "Přejít do administrátorského panelu",
    cancel: "Zavřít",
  },
  es: {
    hostTitle: "Ya eres anfitrión",
    hostDesc: "Puede administrar sus propiedades y reservas en el panel de anfitrión.",
    hostCta: "Ir al panel de anfitrión",
    adminTitle: "Ha iniciado sesión como administrador",
    adminDesc: "Administre la plataforma desde el panel de administración.",
    adminCta: "Ir al panel de administración",
    cancel: "Cerrar",
  },
} as const;

interface BecomeHostButtonProps {
  className?: string;
}

export const BecomeHostButton = ({ className }: BecomeHostButtonProps) => {
  const { user, isAdmin, userRoles } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState<"host" | "admin" | null>(null);
  const [openBecomeHost, setOpenBecomeHost] = useState(false);

  const lang = (["en", "cs", "es"].includes(i18n.language) ? i18n.language : "en") as keyof typeof COPY;
  const c = COPY[lang];

  const isHost = userRoles?.includes("host" as never);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setOpenBecomeHost(true);
      return;
    }
    if (isAdmin) {
      setOpenDialog("admin");
      return;
    }
    if (isHost) {
      setOpenDialog("host");
      return;
    }
    setOpenBecomeHost(true);
  };

  const dialog = openDialog === "admin"
    ? { title: c.adminTitle, desc: c.adminDesc, cta: c.adminCta, target: "/admin", Icon: Shield }
    : openDialog === "host"
    ? { title: c.hostTitle, desc: c.hostDesc, cta: c.hostCta, target: "/host", Icon: Home }
    : null;

  return (
    <>
      <Button
        onClick={handleClick}
        className={className ?? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase tracking-wider"}
      >
        {t("nav.becomeHost")}
      </Button>

      <BecomeHostDialog open={openBecomeHost} onOpenChange={setOpenBecomeHost} />

      <Dialog open={!!openDialog} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-md">
          {dialog && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
                  <dialog.Icon className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-center">{dialog.title}</DialogTitle>
                <DialogDescription className="text-center">{dialog.desc}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-center gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(null)}>
                  {c.cancel}
                </Button>
                <Button
                  onClick={() => {
                    setOpenDialog(null);
                    navigate(dialog.target);
                  }}
                >
                  {dialog.cta}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
