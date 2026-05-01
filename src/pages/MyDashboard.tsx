import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  LogOut, 
  Loader2, 
  Home,
  Users,
  Network,
  Building2,
  Settings,
  Shield,
  CalendarDays,
  MessageSquare
} from "lucide-react";
import { RentalMessagesInbox } from "@/components/rentals/RentalMessagesInbox";
import { UserStatusCard } from "@/components/dashboard/UserStatusCard";
import { LeadsOverview } from "@/components/dashboard/LeadsOverview";
import { CoordinatorNetwork } from "@/components/dashboard/CoordinatorNetwork";
import { MilestoneBanners } from "@/components/dashboard/MilestoneBanners";
import { ObchodnikEventRegistration } from "@/components/dashboard/ObchodnikEventRegistration";
import { AddLeadDialog } from "@/components/tipar/AddLeadDialog";
import logoImage from "@/assets/logo-produbai.png";

interface Lead {
  id: string;
  lead_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  warmth_level: number;
  budget: string | null;
  property_value: number | null;
  lead_level: number | null;
  seminar_accepted: boolean | null;
  questionnaire_completed_independently: boolean | null;
  created_at: string;
}

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string;
  affiliate_code: string | null;
  lifecycle_status: string | null;
  total_turnover_aed: number | null;
  closed_deals_count: number | null;
}

interface UserRole {
  role: string;
}

interface TiparAssignment {
  tipar_id: string;
  tipar: ProfileData;
}

interface TiparStats {
  id: string;
  fullName: string | null;
  email: string;
  totalLeads: number;
  qualifiedLeads: number;
  totalCommission: number;
  warmthAverage: number;
}

const MyDashboard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [tiparStats, setTiparStats] = useState<TiparStats[]>([]);
  const [totalSuperCommission, setTotalSuperCommission] = useState(0);

  // Derived states
  const isTipar = roles.includes('tipar');
  const isCoordinator = roles.includes('influencer_coordinator');
  const isObchodnik = roles.includes('obchodnik') || roles.includes('senior_obchodnik');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, affiliate_code, lifecycle_status, total_turnover_aed, closed_deals_count")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
      } else {
        setProfile(profileData);

        // Generate affiliate code if missing and user wants tipar features
        if (!profileData.affiliate_code) {
          const { data: newCode } = await supabase.rpc("generate_affiliate_code");
          if (newCode) {
            await supabase
              .from("profiles")
              .update({ affiliate_code: newCode })
              .eq("id", user.id);
            setProfile({ ...profileData, affiliate_code: newCode });
          }
        }
      }

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) {
        console.error("Roles error:", rolesError);
      } else {
        setRoles(rolesData?.map(r => r.role) || []);
      }

      // Fetch leads for tipars
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (leadsError) {
        console.error("Leads error:", leadsError);
      } else {
        setLeads(leadsData || []);
      }

      // Fetch coordinator network if user is coordinator
      if (rolesData?.some(r => r.role === 'influencer_coordinator')) {
        await fetchCoordinatorNetwork(user.id);
      }

    } catch (error: any) {
      console.error("Dashboard error:", error);
      toast({
        title: "Chyba při načítání",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoordinatorNetwork = async (coordinatorId: string) => {
    try {
      // Fetch assigned tipars
      const { data: assignments, error: assignError } = await supabase
        .from("coordinator_assignments")
        .select(`
          tipar_id,
          tipar:profiles!coordinator_assignments_tipar_id_fkey(id, full_name, email)
        `)
        .eq("coordinator_id", coordinatorId);

      if (assignError) {
        console.error("Assignments error:", assignError);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setTiparStats([]);
        return;
      }

      // Fetch leads for each tipar
      const tiparIds = assignments.map(a => a.tipar_id);
      const { data: allLeads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .in("referrer_id", tiparIds);

      if (leadsError) {
        console.error("Tipar leads error:", leadsError);
        return;
      }

      // Calculate stats for each tipar
      const stats: TiparStats[] = assignments.map(a => {
        const tiparLeads = allLeads?.filter(l => l.referrer_id === a.tipar_id) || [];
        const qualifiedLeads = tiparLeads.filter(l => l.lead_level === 3);
        const totalCommission = tiparLeads.reduce((acc, lead) => {
          if (!lead.property_value) return acc;
          const coefficient = lead.lead_level === 3 ? 1.0 : lead.lead_level === 2 ? 0.75 : 0.5;
          const isQualified = lead.lead_level !== 3 || lead.seminar_accepted || lead.questionnaire_completed_independently;
          return acc + (isQualified ? lead.property_value * 0.01 * coefficient : 0);
        }, 0);
        const warmthAverage = tiparLeads.length > 0
          ? tiparLeads.reduce((acc, l) => acc + l.warmth_level, 0) / tiparLeads.length
          : 0;

        const tipar = a.tipar as unknown as ProfileData;
        return {
          id: a.tipar_id,
          fullName: tipar?.full_name || null,
          email: tipar?.email || "Neznámý",
          totalLeads: tiparLeads.length,
          qualifiedLeads: qualifiedLeads.length,
          totalCommission,
          warmthAverage,
        };
      });

      setTiparStats(stats);

      // Calculate super commission (e.g., 10% of network commission)
      const totalNetworkCommission = stats.reduce((acc, s) => acc + s.totalCommission, 0);
      setTotalSuperCommission(totalNetworkCommission * 0.1);

    } catch (error) {
      console.error("Coordinator network error:", error);
    }
  };

  const handleLeadAdded = () => {
    setAddLeadOpen(false);
    fetchDashboardData();
    toast({
      title: "Lead přidán",
      description: "Nový lead byl úspěšně zaregistrován.",
    });
  };

  const affiliateLink = profile?.affiliate_code 
    ? `${window.location.origin}/?ref=${profile.affiliate_code}`
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={logoImage} alt="ProDubai" className="h-16 w-auto opacity-50 brightness-0 invert" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("dashboard.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src={logoImage} alt="ProDubai" className="h-10 w-auto brightness-0 invert" />
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">
                {t("dashboard.title")}
              </h1>
              <p className="text-xs text-muted-foreground">{t("dashboard.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="sm" asChild className="hidden sm:flex border-primary/30 text-primary">
                <Link to="/admin">
                  <Shield className="mr-2 h-4 w-4" />
                  {t("dashboard.admin")}
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                {t("dashboard.web")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("dashboard.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Milestone Banners */}
        {profile && (
          <MilestoneBanners
            userId={user?.id || ''}
            closedDealsCount={profile.closed_deals_count || 0}
            totalTurnoverAed={profile.total_turnover_aed || 0}
            lifecycleStatus={profile.lifecycle_status || 'visitor'}
            roles={roles}
          />
        )}

        {/* User Status Card */}
        <UserStatusCard
          fullName={profile?.full_name || null}
          email={profile?.email || user?.email || ""}
          lifecycleStatus={profile?.lifecycle_status || "visitor"}
          roles={roles}
          totalTurnoverAed={profile?.total_turnover_aed || 0}
          closedDealsCount={profile?.closed_deals_count || 0}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue={isCoordinator ? "network" : "leads"} className="space-y-6">
          <TabsList className="bg-card border border-border/50 p-1">
            {(isTipar || leads.length > 0) && (
              <TabsTrigger 
                value="leads" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.tabs.leads")}</span>
              </TabsTrigger>
            )}
            {isCoordinator && (
              <TabsTrigger 
                value="network" 
                className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Network className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.tabs.network")}</span>
              </TabsTrigger>
            )}
            {isObchodnik && (
              <TabsTrigger 
                value="properties" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.tabs.properties")}</span>
              </TabsTrigger>
            )}
            {isObchodnik && (
              <TabsTrigger 
                value="events" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.tabs.events")}</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="messages" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dashboard.tabs.messages")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dashboard.tabs.settings")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Leads Tab */}
          {(isTipar || leads.length > 0) && (
            <TabsContent value="leads" className="space-y-6">
              <LeadsOverview
                leads={leads}
                onAddLead={() => setAddLeadOpen(true)}
                affiliateLink={affiliateLink}
              />
            </TabsContent>
          )}

          {/* Coordinator Network Tab */}
          {isCoordinator && (
            <TabsContent value="network" className="space-y-6">
              <CoordinatorNetwork
                tipars={tiparStats}
                totalSuperCommission={totalSuperCommission}
              />
            </TabsContent>
          )}

          {/* Properties Tab (for obchodnik) */}
          {isObchodnik && (
            <TabsContent value="properties" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {t("dashboard.propertiesEmpty")}
                </p>
                <Button asChild>
                  <Link to="/user-dashboard">
                    {t("dashboard.goToSalesPanel")}
                  </Link>
                </Button>
              </motion.div>
            </TabsContent>
          )}

          {/* Events Tab (for obchodnik) */}
          {isObchodnik && (
            <TabsContent value="events" className="space-y-6">
              <ObchodnikEventRegistration />
            </TabsContent>
          )}

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            {user && <RentalMessagesInbox currentUserId={user.id} />}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Settings className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">{t("dashboard.settingsTitle")}</p>
              <p className="text-sm text-muted-foreground/70 mb-4">
                {t("dashboard.emailLabel")} {profile?.email || user?.email}
              </p>
              {profile?.affiliate_code && (
                <p className="text-sm text-muted-foreground/70">
                  {t("dashboard.affiliateLabel")} <span className="font-mono text-primary">{profile.affiliate_code}</span>
                </p>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Add Lead Dialog */}
      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        onSuccess={handleLeadAdded}
      />
    </div>
  );
};

export default MyDashboard;
