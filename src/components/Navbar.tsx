import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import produbaiLogo from "@/assets/produbai-logo.png";
import produbaiLogoWhite from "@/assets/produbai-logo-white.svg";
import { useTranslation } from "react-i18next";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { LayoutDashboard, Heart, Globe, ChevronDown, Check } from "lucide-react";
import { ContactDialog } from "@/components/ContactDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { BecomeHostButton } from "@/components/BecomeHostButton";
import { NavbarUserAvatar } from "@/components/NavbarUserAvatar";
import { DashboardSwitcher } from "@/components/DashboardSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "cs", label: "Čeština" },
] as const;


// Pages that should always have dark navbar background
const DARK_NAVBAR_PAGES = ['/map', '/map-for-sale', '/nemovitosti-mapa', '/rentals'];

// Path prefixes that should always render dark navbar (for dynamic routes)
const DARK_NAVBAR_PREFIXES = ['/rentals/', '/nemovitost/'];

export const Navbar = () => {
  const [isVip, setIsVip] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const location = useLocation();
  const { user, isAdmin, userRoles } = useAuth();
  const { favorites } = useFavorites();
  const { t, i18n } = useTranslation();
  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === i18n.language) ?? LANGUAGE_OPTIONS[0];
  const isHost = userRoles?.includes('host' as never);

  // Check if current page should always have dark navbar
  // (includes /rentals/<slug> detail and /rentals/host/<id> pages — but NOT /rentals listing)
  const forceDarkNavbar =
    DARK_NAVBAR_PAGES.includes(location.pathname) ||
    DARK_NAVBAR_PREFIXES.some((p) => location.pathname.startsWith(p));

  // Determine dashboard link based on role
  const dashboardLink = isAdmin ? "/admin" : isHost ? "/host" : "/dashboard";
  const dashboardTitle = isAdmin ? t("nav.adminPanel") : isHost ? t("nav.hostPanel") : t("nav.dashboard");
  const favoritesCount = favorites.length;

  useEffect(() => {
    if (user) {
      checkVipStatus();
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Track if we've scrolled past the hero section
      setIsScrolled(currentScrollY > 100);
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const checkVipStatus = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("lifecycle_status")
        .eq("id", user.id)
        .single();
      setIsVip(profile?.lifecycle_status === 'vip');
    } catch (error) {
      console.error("Error checking VIP status:", error);
    }
  };

  // Use solid background on pages where transparent navbar would be invisible (e.g. map pages)
  const showDarkBg = forceDarkNavbar;

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${showDarkBg ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}>
        <div className="container mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex flex-col group">
              <span className={`text-2xl font-bold tracking-tight ${showDarkBg ? 'text-foreground' : 'text-white'}`}>
                go2dubai.online
              </span>
              <span className={`text-[0.7rem] uppercase tracking-[0.05em] ${showDarkBg ? 'text-muted-foreground' : 'text-white/60'}`}>
                DUBAI VILLAS & APARTMENTS
              </span>
            </Link>
            <div className="hidden sm:block h-8 w-px bg-current opacity-20" aria-hidden="true" />
            <Link
              to="/"
              className="hidden sm:flex items-center"
              aria-label="Produbai"
            >
              <img
                src={showDarkBg ? produbaiLogo : produbaiLogoWhite}
                alt="Produbai"
                className="h-5 w-auto object-contain"
              />
            </Link>
          </div>
          
          {/* Desktop nav removed — using hamburger menu on all viewports */}

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${showDarkBg ? 'text-foreground/70 hover:text-foreground' : 'text-white'} transition-colors`}>
                  <Globe className="h-3.5 w-3.5" />
                  {currentLang.label}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.code}
                    onClick={() => i18n.changeLanguage(opt.code)}
                    className="flex items-center justify-between gap-4"
                  >
                    <span>{opt.label}</span>
                    {i18n.language === opt.code && <Check className="h-4 w-4 text-accent" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User actions (dashboard switcher, notifications, avatar) moved to hamburger menu */}
            
            {/* Become a Host button — premium pill */}
            <BecomeHostButton className="hidden sm:inline-flex bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full px-5 h-9 text-sm" />

            <div>
              <HamburgerMenu onBrochureClick={() => {}} dark={showDarkBg} />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
