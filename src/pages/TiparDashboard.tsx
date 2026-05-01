import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  DollarSign, 
  Link2, 
  Copy, 
  Check,
  TrendingUp,
  UserPlus,
  Star,
  ArrowRight,
  MousePointerClick,
  ClipboardList,
  ExternalLink,
  Trophy,
  Target
} from "lucide-react";
import { AddLeadDialog } from "@/components/tipar/AddLeadDialog";
import { ReferrerLeadsTable } from "@/components/tipar/ReferrerLeadsTable";
import { NewLeadNotification } from "@/components/tipar/NewLeadNotification";
import { TiparEventInvite } from "@/components/dashboard/TiparEventInvite";

interface ReferrerLead {
  id: string;
  lead_name: string;
  status: string;
  warmth_level: number;
  property_value: number | null;
  lead_level: number | null;
  commission_rate: number | null;
  lead_type: string;
  created_at: string;
}

interface ProfileData {
  affiliate_code: string | null;
  full_name: string | null;
  role: string;
}

const TiparDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<ReferrerLead[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [clicksCount, setClicksCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfileAndLeads();
    }
  }, [user]);

  const fetchProfileAndLeads = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("affiliate_code, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // If no affiliate code, generate one
      if (!profileData.affiliate_code) {
        const { data: newCode } = await supabase.rpc("generate_affiliate_code");
        if (newCode) {
          await supabase
            .from("profiles")
            .update({ affiliate_code: newCode, role: "tipar" })
            .eq("id", user.id);
          
          setProfile({ ...profileData, affiliate_code: newCode, role: "tipar" });
        }
      } else {
        setProfile(profileData);
      }

      // Fetch leads - only necessary fields for referrer view (no PII)
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("id, lead_name, status, warmth_level, property_value, lead_level, commission_rate, lead_type, created_at")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;
      setLeads((leadsData || []) as ReferrerLead[]);

      // Fetch click count
      const { count, error: clicksError } = await supabase
        .from("affiliate_clicks")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      if (!clicksError && count !== null) {
        setClicksCount(count);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = profile?.affiliate_code 
    ? `${window.location.origin}?ref=${profile.affiliate_code}` 
    : "";

  const investorProfileUrl = profile?.affiliate_code
    ? `${window.location.origin}/investor-profil?ref=${profile.affiliate_code}`
    : `${window.location.origin}/investor-profil`;

  const [copiedInvestor, setCopiedInvestor] = useState(false);

  const copyInvestorLink = async () => {
    try {
      await navigator.clipboard.writeText(investorProfileUrl);
      setCopiedInvestor(true);
      toast({
        title: "Odkaz zkopírován!",
        description: "Odkaz na investorský formulář byl zkopírován."
      });
      setTimeout(() => setCopiedInvestor(false), 2000);
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodařilo se zkopírovat odkaz.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Odkaz zkopírován!",
        description: "Váš partnerský odkaz byl zkopírován do schránky."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodařilo se zkopírovat odkaz.",
        variant: "destructive"
      });
    }
  };

  // Calculate stats
  const totalLeads = leads.length;
  const influencerLeads = leads.filter(l => l.status === "influencer").length;
  const personalLeads = leads.filter(l => l.status === "personal").length;
  const supertipLeads = leads.filter(l => l.status === "supertip").length;

  const totalCommission = leads.reduce((sum, lead) => {
    if (!lead.property_value) return sum;
    const commissionRate = lead.warmth_level === 100 ? 0.01 : 
                          lead.warmth_level === 75 ? 0.0075 : 0.005;
    return sum + (lead.property_value * commissionRate);
  }, 0);

  const handleLeadAdded = () => {
    fetchProfileAndLeads();
    setAddLeadOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Dashboard Tipaře
            </h1>
            <p className="text-muted-foreground">
              Vítejte zpět, {profile?.full_name || user?.email}
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Kliknutí na odkaz
                  </CardTitle>
                  <MousePointerClick className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{clicksCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Celkem návštěv přes váš odkaz
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Celkem leadů
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{totalLeads}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {influencerLeads} Inf.
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {personalLeads} Osob.
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {supertipLeads} Super
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Potenciální provize
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {new Intl.NumberFormat("cs-CZ", {
                      style: "currency",
                      currency: "CZK",
                      maximumFractionDigits: 0
                    }).format(totalCommission)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Založeno na hodnotě nemovitostí
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Průměrná teplota
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {totalLeads > 0 
                      ? Math.round(leads.reduce((sum, l) => sum + l.warmth_level, 0) / totalLeads)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kvalita vašich kontaktů
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Váš kód
                  </CardTitle>
                  <Link2 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold text-primary">
                    {profile?.affiliate_code || "—"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unikátní affiliate kód
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Share & Earn Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Star className="h-5 w-5 text-primary" />
                  Sdílej & Vydělávej
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Sdílejte svůj jedinečný odkaz a získejte provizi z každého úspěšného obchodu.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-background border border-border rounded-lg px-4 py-3 font-mono text-sm text-muted-foreground truncate">
                    {shareUrl || "Generuji odkaz..."}
                  </div>
                  <Button 
                    onClick={copyToClipboard}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={!shareUrl}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Zkopírováno
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Kopírovat odkaz
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-background/50 rounded-lg p-3">
                    <div className="text-lg font-bold text-primary">0,5%</div>
                    <div className="text-xs text-muted-foreground">Influencer</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <div className="text-lg font-bold text-primary">0,75%</div>
                    <div className="text-xs text-muted-foreground">Osobní</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <div className="text-lg font-bold text-primary">1%</div>
                    <div className="text-xs text-muted-foreground">Supertip</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Investor Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <ClipboardList className="h-5 w-5 text-amber-500" />
                  Investorský formulář (Supertip 100%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Sdílejte tento formulář pro získání kvalifikovaných investorů. Vyplněním formuláře získáte lead s <span className="font-bold text-amber-500">1% provizí</span> z hodnoty nemovitosti.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-background border border-border rounded-lg px-4 py-3 font-mono text-sm text-muted-foreground truncate">
                    {investorProfileUrl}
                  </div>
                  <Button 
                    onClick={copyInvestorLink}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {copiedInvestor ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Zkopírováno
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Kopírovat odkaz
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/investor-profil")}
                    className="border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Zobrazit formulář
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Event Invite Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mb-8"
          >
            <TiparEventInvite affiliateCode={profile?.affiliate_code || null} />
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-4 mb-8"
          >
            <Button 
              onClick={() => setAddLeadOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Přidat nový lead
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/nemovitosti")}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Prohlédnout nemovitosti
            </Button>
          </motion.div>

          {/* Leads Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Vaše leady
                </CardTitle>
                <Badge variant="secondary">
                  {leads.length} {leads.length === 1 ? "lead" : "leadů"}
                </Badge>
              </CardHeader>
              <CardContent>
                <ReferrerLeadsTable leads={leads} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Real-time notifications */}
          <NewLeadNotification onNewLead={fetchProfileAndLeads} />
        </div>
      </main>

      <AddLeadDialog 
        open={addLeadOpen} 
        onOpenChange={setAddLeadOpen}
        onSuccess={handleLeadAdded}
      />

      <Footer />
    </div>
  );
};

export default TiparDashboard;