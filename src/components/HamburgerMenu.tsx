import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, ArrowUpRight, Globe, Check, MessageCircle, FileText, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ContactDialog } from "@/components/ContactDialog";
import { BecomeHostDialog } from "@/components/BecomeHostDialog";
import { RegisterDialog } from "@/components/RegisterDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NavbarUserAvatar } from "@/components/NavbarUserAvatar";
import { DashboardSwitcher } from "@/components/DashboardSwitcher";
import { useAuth } from "@/contexts/AuthContext";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "cs", label: "Čeština" },
] as const;

interface HamburgerMenuProps {
  onBrochureClick?: () => void;
  dark?: boolean;
}

export const HamburgerMenu = ({ onBrochureClick, dark = false }: HamburgerMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [openBecomeHost, setOpenBecomeHost] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const { user, isAdmin, userRoles } = useAuth();
  const { t, i18n } = useTranslation();
  const isHost = userRoles?.includes("host" as never);

  const dashboardLink = isAdmin ? "/admin" : isHost ? "/host" : "/dashboard";
  const dashboardTitle = isAdmin ? t("nav.adminPanel") : isHost ? t("nav.hostPanel") : t("nav.dashboard");

  const close = () => setIsOpen(false);

  const navItems = [
    { to: "/rentals", label: t("nav.villas") },
    { to: "/map", label: t("nav.map") },
    { to: "/map-for-sale", label: t("nav.developmentProjects") },
    { to: "/invest", label: t("nav.invest") },
    { to: "/why-dubai", label: t("nav.whyDubai") },
    { to: "/blog", label: t("nav.blog") },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={`${dark ? 'text-foreground hover:text-foreground' : 'text-white hover:text-white'} hover:bg-transparent`}>
          <Menu className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 bg-background border-l border-border flex flex-col [&>button]:hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-3 border-b border-border/60">
          <Link to="/" onClick={close} className="flex flex-col group">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              go2dubai.online
            </span>
            <span className="text-[0.7rem] uppercase tracking-[0.05em] text-muted-foreground">
              DUBAI VILLAS & APARTMENTS
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <NotificationCenter />
                <NavbarUserAvatar to={dashboardLink} title={dashboardTitle} />
              </div>
            )}
            <button
              onClick={close}
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Numbered nav list */}
        <nav className="flex flex-col">
          {navItems.map((item, idx) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={close}
              className="group flex items-center gap-6 px-8 py-2.5 border-t border-border/60 hover:bg-muted/40 transition-colors"
            >
              <span className="text-xs tabular-nums text-muted-foreground font-medium tracking-wider w-6">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-xl md:text-2xl font-serif tracking-tight text-foreground">
                {item.label}
              </span>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" strokeWidth={1.5} />
            </Link>
          ))}

          {/* Secondary link: dashboard / login */}
          <div className="border-t border-border/60">
            {user ? (
              <Link
                to={dashboardLink}
                onClick={close}
                className="group flex items-center gap-3 px-8 py-2 hover:bg-muted/40 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="flex-1 text-sm font-medium text-foreground">{dashboardTitle}</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  onClick={close}
                  className="group flex items-center gap-3 px-8 py-2 hover:bg-muted/40 transition-colors"
                >
                  <LogIn className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="flex-1 text-sm font-medium text-foreground">{t("nav.login")}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                </Link>
                <button
                  onClick={() => { close(); setTimeout(() => setOpenRegister(true), 150); }}
                  className="group flex items-center gap-3 px-8 py-2 w-full border-t border-border/60 hover:bg-muted/40 transition-colors text-left"
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="flex-1 text-sm font-medium text-foreground">{t("nav.register")}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer actions */}
        <div className="px-8 py-3 border-t border-border/60 space-y-2">
          {/* Contact + Brochure pills */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { close(); setTimeout(() => setOpenContact(true), 150); }}
              className="flex items-center justify-center gap-2 h-10 rounded-full border border-border bg-background hover:bg-muted transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
              {t("nav.contact")}
            </button>
            <button
              onClick={() => { close(); setTimeout(() => setOpenBecomeHost(true), 150); onBrochureClick?.(); }}
              className="flex items-center justify-center gap-2 h-10 rounded-full border border-border bg-background hover:bg-muted transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <FileText className="h-4 w-4" strokeWidth={1.5} />
              {t("nav.becomeHost")}
            </button>
          </div>

          {/* WhatsApp dark pill */}
          <a
            href="https://wa.me/420739322515"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 h-11 px-6 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            <span className="flex items-center gap-3 text-sm font-medium">
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
              WhatsApp — +420 739 322 515
            </span>
            <span className="h-7 w-7 rounded-full border border-background/30 flex items-center justify-center group-hover:bg-background/10 transition-colors">
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </a>

          {/* Language switcher */}
          <div className="flex items-center justify-center gap-1 pt-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground mr-2" strokeWidth={1.5} />
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                onClick={() => i18n.changeLanguage(opt.code)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${
                  i18n.language === opt.code
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.code}
                {i18n.language === opt.code && <Check className="h-3 w-3" strokeWidth={2} />}
              </button>
            ))}
          </div>
        </div>
      </SheetContent>

      {/* Mounted dialogs */}
      {/* Mounted dialogs */}
      <ContactDialog open={openContact} onOpenChange={setOpenContact} />
      <BecomeHostDialog open={openBecomeHost} onOpenChange={setOpenBecomeHost} />
      <RegisterDialog open={openRegister} onOpenChange={setOpenRegister} />
    </Sheet>
  );
};
