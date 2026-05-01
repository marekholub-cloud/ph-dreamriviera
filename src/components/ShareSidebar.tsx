import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  X,
  Copy,
  Check,
  Instagram,
  Facebook,
  MessageCircle,
  Gift,
  LogIn,
  UserPlus,
  ChevronLeft,
  ClipboardList,
} from "lucide-react";

interface ProfileData {
  affiliate_code: string | null;
  role: string;
}

export const ShareSidebar = () => {
  const { user, isObchodnik } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isTiparRole, setIsTiparRole] = useState(false);

  // Hide sidebar on embed pages
  if (location.pathname.startsWith('/embed')) {
    return null;
  }

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkTiparRole();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("affiliate_code, role")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const checkTiparRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "tipar")
      .maybeSingle();

    setIsTiparRole(!!data);
  };

  const shareUrl = profile?.affiliate_code
    ? `${window.location.origin}${window.location.pathname}?ref=${profile.affiliate_code}`
    : window.location.href;

  const investorProfileUrl = profile?.affiliate_code
    ? `${window.location.origin}/investor-profil?ref=${profile.affiliate_code}`
    : `${window.location.origin}/investor-profil`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Odkaz zkopírován!",
        description: "Váš sdílecí odkaz byl zkopírován do schránky.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodařilo se zkopírovat odkaz.",
        variant: "destructive",
      });
    }
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Podívej se na tuto zajímavou investiční příležitost: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareToInstagram = () => {
    // Instagram doesn't have direct share URL, copy link and notify user
    copyToClipboard();
    toast({
      title: "Odkaz zkopírován!",
      description: "Vložte odkaz do příběhu nebo zprávy na Instagramu.",
    });
  };

  // User has tipar privileges if they have tipar role OR obchodnik role
  const hasPartnerAccess = isTiparRole || isObchodnik;

  return (
    <>
      {/* Tab trigger */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 z-[60] bg-primary text-primary-foreground px-2 py-4 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors"
        style={{ top: 'calc(50% - 136px)' }}
        initial={{ x: 0 }}
        animate={{ x: isOpen ? 100 : 0 }}
        whileHover={{ x: -4 }}
      >
        <div className="flex flex-col items-center gap-1">
          <Share2 className="h-5 w-5" />
          <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: "vertical-rl" }}>
            Sdílet
          </span>
        </div>
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-card border-l border-border shadow-2xl z-[101] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Sdílet stránku
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {/* Logged in user with affiliate */}
              {user && hasPartnerAccess && (
                <>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-foreground">Váš partnerský odkaz</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sdílejte tento odkaz a získejte provizi za každý úspěšný obchod!
                    </p>
                    <div className="bg-background border border-border rounded-lg p-2 text-xs font-mono text-muted-foreground break-all mb-3">
                      {shareUrl}
                    </div>
                    <div className="text-xs text-primary font-medium">
                      Kód: {profile.affiliate_code}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Sdílet na:</p>
                    
                    <Button
                      onClick={shareToFacebook}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <span>Facebook</span>
                    </Button>

                    <Button
                      onClick={shareToInstagram}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <Instagram className="h-5 w-5 text-pink-600" />
                      <span>Instagram</span>
                    </Button>

                    <Button
                      onClick={shareToWhatsApp}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <span>WhatsApp</span>
                    </Button>

                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span>{copied ? "Zkopírováno!" : "Kopírovat odkaz"}</span>
                    </Button>
                  </div>

                  {/* Investor Profile Link Section */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="h-5 w-5 text-amber-500" />
                      <span className="font-semibold text-foreground">Formulář pro investory</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sdílejte tento formulář pro získání kvalifikovaných investorů (Supertip 100%).
                    </p>
                    <div className="bg-background border border-border rounded-lg p-2 text-xs font-mono text-muted-foreground break-all mb-3">
                      {investorProfileUrl}
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(investorProfileUrl);
                          toast({
                            title: "Odkaz zkopírován!",
                            description: "Odkaz na investorský formulář byl zkopírován.",
                          });
                        } catch {
                          toast({
                            title: "Chyba",
                            description: "Nepodařilo se zkopírovat odkaz.",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="outline"
                      className="w-full gap-2 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <Copy className="h-4 w-4" />
                      Kopírovat odkaz na formulář
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/admin");
                    }}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Přejít na Dashboard
                  </Button>
                </>
              )}

              {/* Logged in but not tipar */}
              {user && !hasPartnerAccess && (
                <>
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-foreground">Staňte se tipařem!</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Získejte svůj unikátní odkaz a vydělávejte na doporučeních.
                    </p>
                    <Button
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/admin");
                      }}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Aktivovat partnerský program
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Sdílet stránku:</p>
                    
                    <Button
                      onClick={shareToFacebook}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <span>Facebook</span>
                    </Button>

                    <Button
                      onClick={shareToWhatsApp}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <span>WhatsApp</span>
                    </Button>

                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span>{copied ? "Zkopírováno!" : "Kopírovat odkaz"}</span>
                    </Button>
                  </div>
                </>
              )}

              {/* Not logged in */}
              {!user && (
                <>
                  <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="h-6 w-6 text-primary" />
                      <span className="font-bold text-lg text-foreground">Vydělávej s námi!</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Víš, že za tvoje doporučení tě můžeme <strong className="text-primary">odměnit až 1% z hodnoty nemovitosti</strong>? 
                      Staň se tipařem a získej svůj unikátní sdílecí odkaz!
                    </p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          setIsOpen(false);
                          navigate("/auth");
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Přihlásit se
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Nebo sdílej stránku:</p>
                    
                    <Button
                      onClick={shareToFacebook}
                      variant="outline"
                      className="w-full justify-start gap-3 h-11"
                    >
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <span>Facebook</span>
                    </Button>

                    <Button
                      onClick={shareToWhatsApp}
                      variant="outline"
                      className="w-full justify-start gap-3 h-11"
                    >
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <span>WhatsApp</span>
                    </Button>

                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="w-full justify-start gap-3 h-11"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span>{copied ? "Zkopírováno!" : "Kopírovat odkaz"}</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};