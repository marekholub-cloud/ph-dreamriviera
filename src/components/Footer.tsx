import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { BecomeHostButton } from "./BecomeHostButton";
import { PrivacyPolicyDialog } from "./PrivacyPolicyDialog";
import { TermsOfServiceDialog } from "./TermsOfServiceDialog";
import dreamRivieraLogo from "@/assets/dream-riviera-logo.png";

interface FooterProps {
  hideBlog?: boolean;
}

export const Footer = ({ hideBlog = false }: FooterProps) => {
  const { t } = useTranslation();

  const linkCls =
    "text-background/70 hover:text-accent transition-colors duration-300";
  const iconLinkCls =
    "text-background/50 hover:text-accent transition-colors duration-300";

  return (
    <footer className="bg-foreground text-background">
      {/* Top editorial band */}
      <div className="border-b border-background/10">
        <div className="container mx-auto px-6 py-16 md:py-20">
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <p className="text-xs uppercase tracking-[0.3em] text-background/50 mb-6">
                — Dream Riviera
              </p>
              <h2 className="editorial-headline text-4xl md:text-6xl text-background leading-[1.05]">
                Own the Coast. <span className="italic text-accent">Experience</span> the Lifestyle.
              </h2>
            </div>
            <div className="md:col-span-4 md:text-right">
              <Link
                to="/rentals"
                className="inline-flex items-center gap-2 text-background hover:text-accent transition-colors duration-300 group"
              >
                <span className="text-sm uppercase tracking-[0.2em]">
                  {t("footer.villasForRent")}
                </span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-4">
            <Link to="/" className="flex flex-col mb-6">
              <img src={dreamRivieraLogo} alt="Dream Riviera" className="h-20 w-auto object-contain self-start mb-2" />
              <span className="text-[11px] uppercase tracking-[0.25em] text-background/50 mt-1">
                {t("footer.tagline")}
              </span>
            </Link>
            <p className="text-background/65 text-sm font-light leading-relaxed max-w-sm mb-8">
              {t("footer.intro")}
            </p>
            <div className="flex gap-5">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={iconLinkCls} aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={iconLinkCls} aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={iconLinkCls} aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-background/50 mb-6">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-3 text-sm font-light">
              <li><Link to="/rentals" className={linkCls}>{t("footer.villasForRent")}</Link></li>
              <li><Link to="/map" className={linkCls}>{t("footer.map")}</Link></li>
              {!hideBlog && (
                <li><Link to="/blog" className={linkCls}>{t("footer.blog")}</Link></li>
              )}
              <li><Link to="/invest" className={linkCls}>Invest</Link></li>
              <li><Link to="/why-dubai" className={linkCls}>Why Dubai</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-background/50 mb-6">
              Contact
            </h4>
            <ul className="space-y-5 text-sm font-light">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-accent flex-shrink-0 mt-1" />
                <span className="text-background/70 whitespace-pre-line leading-relaxed">
                  {"Praha\nWashingtonova 1624/5\n110 00 Praha 1"}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-accent flex-shrink-0 mt-1" />
                <span className="text-background/70 whitespace-pre-line leading-relaxed">
                  {"PRESTON DEVELOPMENT FZ LLC\nAcademic Zone 01 – Business Center 5\nB12-428, RAKEZ Business Zone-FZ\nRas Al Khaimah, UAE\nLicence: 5024998"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-accent flex-shrink-0" />
                <a href="tel:+420739322515" className={linkCls}>+420 739 322 515</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-accent flex-shrink-0" />
                <a href="mailto:info@produbai.eu" className={linkCls}>info@produbai.eu</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-background/50 tracking-wide">
              © {new Date().getFullYear()} Dream Riviera — {t("footer.rights")}.
            </p>
            <div className="flex gap-8 text-xs uppercase tracking-[0.2em]">
              <PrivacyPolicyDialog>
                <button className={iconLinkCls}>{t("footer.privacy")}</button>
              </PrivacyPolicyDialog>
              <TermsOfServiceDialog>
                <button className={iconLinkCls}>{t("footer.terms")}</button>
              </TermsOfServiceDialog>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
