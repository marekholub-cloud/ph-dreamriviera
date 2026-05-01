import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mail, 
  MessageSquare, 
  CheckCircle2,
  Loader2,
  Phone,
  ArrowRight
} from "lucide-react";
import logo from "@/assets/logo-produbai.png";

const TiparVerification = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    email_verified: boolean;
    phone_verified: boolean;
    phone: string | null;
    full_name: string | null;
    email: string;
  } | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else {
        checkVerificationStatus();
      }
    }
  }, [user, authLoading]);

  const checkVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("email_verified, phone_verified, phone, full_name, email")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);

      // If both verified, redirect to dashboard
      if (data.email_verified && data.phone_verified) {
        navigate("/admin");
      }
    } catch (error) {
      console.error("Error checking verification:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppVerification = async () => {
    if (!user || !profile?.phone) {
      toast({
        title: "Chyba",
        description: "Telefon není zadán v profilu.",
        variant: "destructive"
      });
      return;
    }

    // Cooldown check - 60 seconds between sends
    if (lastSentAt && Date.now() - lastSentAt < 60000) {
      const remainingSeconds = Math.ceil((60000 - (Date.now() - lastSentAt)) / 1000);
      toast({
        title: "Počkejte prosím",
        description: `Můžete odeslat znovu za ${remainingSeconds} sekund.`,
        variant: "destructive"
      });
      return;
    }

    setSendingWhatsApp(true);
    setErrorDetails(null);

    try {
      console.log("Sending WhatsApp verification to:", profile.phone);
      
      const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          phone: profile.phone,
          name: profile.full_name || "Tipař",
          message: `Dobrý den ${profile.full_name || ""},\n\nVítejte v partnerském programu TIPAŘ! 🎉\n\nVáš účet byl úspěšně vytvořen. Pro dokončení registrace prosím odpovězte na tuto zprávu slovem ANO.\n\nDěkujeme za registraci!\nTým ProDubai`
        }
      });

      console.log("WhatsApp response:", { data, error });

      if (error) {
        console.error("WhatsApp function error:", error);
        throw new Error(error.message || "Chyba při odesílání WhatsApp");
      }

      if (data?.error) {
        console.error("WhatsApp API error:", data.error);
        throw new Error(data.details || data.error || "Chyba WhatsApp API");
      }

      // Mark email as verified (since we're using Supabase auth with auto-confirm)
      // and set verification_pending for phone
      await supabase
        .from("profiles")
        .update({ 
          email_verified: true,
          verification_pending: true 
        })
        .eq("id", user.id);

      setWhatsAppSent(true);
      setLastSentAt(Date.now());
      setProfile(prev => prev ? { ...prev, email_verified: true } : null);

      toast({
        title: "WhatsApp zpráva odeslána",
        description: "Zkontrolujte svůj WhatsApp a odpovězte ANO pro dokončení verifikace."
      });
    } catch (error: any) {
      console.error("Error sending WhatsApp:", error);
      const errorMessage = error?.message || "Nepodařilo se odeslat WhatsApp zprávu.";
      setErrorDetails(errorMessage);
      toast({
        title: "Chyba při odesílání WhatsApp",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleContinueToDashboard = async () => {
    if (!user) return;

    // Mark phone as verified (admin will verify manually or via webhook)
    await supabase
      .from("profiles")
      .update({ 
        phone_verified: true,
        verification_pending: false
      })
      .eq("id", user.id);

    navigate("/admin");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <img src={logo} alt="Logo" className="h-16 mb-6" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Registrace úspěšná!
            </h1>
            <p className="text-muted-foreground">
              Pro aktivaci účtu prosím dokončete verifikaci
            </p>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">Ověření účtu</CardTitle>
              <CardDescription>
                Pro přístup k partnerskému programu je potřeba ověřit váš kontakt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email verification - auto done with Supabase */}
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  profile?.email_verified ? "bg-green-500/20" : "bg-muted"
                }`}>
                  <Mail className={`h-5 w-5 ${
                    profile?.email_verified ? "text-green-500" : "text-muted-foreground"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Email</span>
                    {profile?.email_verified && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile?.email}
                  </p>
                  {profile?.email_verified ? (
                    <span className="text-xs text-green-500">Ověřeno</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Bude ověřeno automaticky</span>
                  )}
                </div>
              </div>

              {/* Phone/WhatsApp verification */}
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  profile?.phone_verified ? "bg-green-500/20" : whatsAppSent ? "bg-amber-500/20" : "bg-muted"
                }`}>
                  <MessageSquare className={`h-5 w-5 ${
                    profile?.phone_verified ? "text-green-500" : whatsAppSent ? "text-amber-500" : "text-muted-foreground"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">WhatsApp</span>
                    {profile?.phone_verified && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile?.phone || "Telefon není zadán"}
                  </p>
                  {profile?.phone_verified ? (
                    <span className="text-xs text-green-500">Ověřeno</span>
                  ) : whatsAppSent ? (
                    <span className="text-xs text-amber-500">Zpráva odeslána - čeká na odpověď</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Čeká na ověření</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-4">
                {!whatsAppSent && !profile?.phone_verified && (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSendWhatsAppVerification}
                    disabled={sendingWhatsApp || !profile?.phone}
                  >
                    {sendingWhatsApp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Odesílám...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Odeslat ověřovací WhatsApp
                      </>
                    )}
                  </Button>
                )}

                {whatsAppSent && (
                  <>
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        <strong>Důležité:</strong> Zkontrolujte svůj WhatsApp a odpovězte na zprávu slovem <strong>ANO</strong>.
                      </p>
                    </div>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleContinueToDashboard}
                    >
                      Pokračovat na Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleSendWhatsAppVerification}
                      disabled={sendingWhatsApp}
                    >
                      Odeslat znovu
                    </Button>
                  </>
                )}
              </div>

              {errorDetails && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive">
                    <strong>Chyba:</strong> {errorDetails}
                  </p>
                </div>
              )}

              {!profile?.phone && (
                <p className="text-sm text-destructive text-center">
                  Pro ověření je potřeba mít vyplněný telefon v profilu.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer hideBlog />
    </div>
  );
};

export default TiparVerification;
