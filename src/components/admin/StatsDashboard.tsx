import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  ShoppingCart,
  AlertTriangle,
  Clock,
  ArrowRight,
  Crown,
  Medal,
  MapPin,
  Eye,
  FileText,
  MoreHorizontal,
  Target,
  Briefcase
} from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { cs } from "date-fns/locale";
import { StatCard } from "./StatCard";

interface Lead {
  id: string;
  lead_name: string;
  status: string;
  warmth_level: number;
  property_value: number | null;
  referrer_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  total_turnover_aed: number | null;
  closed_deals_count: number | null;
}

interface EventRegistration {
  id: string;
  lead_id: string;
  registered_at: string;
}

interface AreaData {
  id: string;
  name: string;
  city: string;
}

interface Property {
  id: string;
  area_id: string | null;
  slug: string;
  is_published: boolean | null;
}

interface BrochureRequest {
  id: string;
  selected_brochures: unknown;
  created_at: string;
}

interface Deal {
  id: string;
  deal_value: number;
  closed_at: string | null;
  lead_id: string;
}

interface FunnelData {
  name: string;
  value: number;
  fill: string;
}

interface AreaInterestData {
  area: string;
  properties: number;
  brochures: number;
  total: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface TopReferrer {
  id: string;
  name: string;
  email: string;
  closedDeals: number;
  totalValue: number;
}

interface InactiveLead {
  id: string;
  name: string;
  email: string | null;
  daysSinceUpdate: number;
  status: string;
  referrerName: string | null;
}

const FUNNEL_COLORS = {
  visitor: "hsl(215, 20%, 50%)",
  lead: "hsl(35, 80%, 50%)",
  qualified: "hsl(200, 70%, 50%)",
  client: "hsl(160, 60%, 45%)",
};

const STATUS_MAP: Record<string, string> = {
  influencer: "Visitor",
  contacted: "Lead",
  qualified: "Qualified",
  closed: "Client",
};

export function StatsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [brochureRequests, setBrochureRequests] = useState<BrochureRequest[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leadsRes, profilesRes, registrationsRes, areasRes, propertiesRes, brochuresRes, dealsRes] = await Promise.all([
        supabase.from("leads").select("*"),
        supabase.from("profiles").select("id, full_name, email, total_turnover_aed, closed_deals_count"),
        supabase.from("event_registrations").select("*"),
        supabase.from("areas").select("id, name, city"),
        supabase.from("properties").select("id, area_id, slug, is_published"),
        supabase.from("brochure_requests").select("id, selected_brochures, created_at"),
        supabase.from("deals").select("id, deal_value, closed_at, lead_id"),
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (registrationsRes.data) setRegistrations(registrationsRes.data);
      if (areasRes.data) setAreas(areasRes.data);
      if (propertiesRes.data) setProperties(propertiesRes.data);
      if (brochuresRes.data) setBrochureRequests(brochuresRes.data);
      if (dealsRes.data) setDeals(dealsRes.data);
    } catch (error) {
      console.error("Error fetching stats data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs from real data
  const totalDealsValue = deals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const totalSalesUSD = totalDealsValue > 0 ? totalDealsValue : profiles.reduce((sum, p) => sum + (p.total_turnover_aed || 0), 0);
  const totalLeads = leads.length;
  const closedLeads = leads.filter(l => l.status === 'closed' || l.status === 'closed_won').length;
  const publishedProperties = properties.filter(p => p.is_published).length;
  
  // Calculate previous month revenue for comparison
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const thisMonthDeals = deals.filter(d => d.closed_at && new Date(d.closed_at) >= thisMonthStart);
  const lastMonthDeals = deals.filter(d => d.closed_at && new Date(d.closed_at) >= lastMonthStart && new Date(d.closed_at) <= lastMonthEnd);
  
  const thisMonthRevenue = thisMonthDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const lastMonthRevenue = lastMonthDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

  // Conversion Funnel Data - based on real lead statuses
  const visitorCount = leads.filter(l => l.status === 'influencer' || l.status === 'new').length;
  const leadCount = leads.filter(l => l.status === 'contacted').length;
  const qualifiedCount = leads.filter(l => l.status === 'qualified' || l.status === 'supertip').length;
  const clientCount = leads.filter(l => l.status === 'closed' || l.status === 'closed_won').length;
  
  const funnelData: FunnelData[] = [
    { name: "Visitor", value: visitorCount || totalLeads, fill: FUNNEL_COLORS.visitor },
    { name: "Lead", value: leadCount + qualifiedCount + clientCount, fill: FUNNEL_COLORS.lead },
    { name: "Qualified", value: qualifiedCount + clientCount, fill: FUNNEL_COLORS.qualified },
    { name: "Client", value: clientCount, fill: FUNNEL_COLORS.client },
  ];

  // Property Interest by Area - real data from areas, properties, and brochure_requests
  const areaInterest: AreaInterestData[] = areas
    .map(area => {
      const areaProperties = properties.filter(p => p.area_id === area.id);
      const propertyIds = new Set(areaProperties.map(p => p.id));
      
      // Count brochure requests that include properties from this area
      const brochureCount = brochureRequests.reduce((count, br) => {
        const brochures = Array.isArray(br.selected_brochures) ? br.selected_brochures : [];
        const hasAreaProperty = brochures.some(propId => propertyIds.has(String(propId)));
        return hasAreaProperty ? count + 1 : count;
      }, 0);

      return {
        area: area.name,
        properties: areaProperties.length,
        brochures: brochureCount,
        total: areaProperties.length + brochureCount,
      };
    })
    .filter(a => a.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Top Referrers - from real profile data
  const topReferrers: TopReferrer[] = profiles
    .filter(p => (p.closed_deals_count || 0) > 0 || (p.total_turnover_aed || 0) > 0)
    .sort((a, b) => (b.total_turnover_aed || 0) - (a.total_turnover_aed || 0))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.full_name || p.email.split('@')[0],
      email: p.email,
      closedDeals: p.closed_deals_count || 0,
      totalValue: p.total_turnover_aed || 0,
    }));

  // Monthly Revenue - real data from deals, fallback to leads created by month
  const getMonthlyRevenue = (): MonthlyRevenue[] => {
    const months: MonthlyRevenue[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Get revenue from deals
      const monthDeals = deals.filter(d => {
        if (!d.closed_at) return false;
        const closedDate = new Date(d.closed_at);
        return closedDate >= monthStart && closedDate <= monthEnd;
      });
      
      const revenue = monthDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
      
      // If no deals, estimate from leads with property_value
      const monthLeads = leads.filter(l => {
        const createdDate = new Date(l.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd && l.property_value;
      });
      
      const estimatedRevenue = revenue > 0 ? revenue : monthLeads.reduce((sum, l) => sum + (l.property_value || 0), 0) * 0.03; // 3% commission estimate
      
      months.push({
        month: format(monthStart, "MMM", { locale: cs }),
        revenue: estimatedRevenue,
      });
    }
    
    return months;
  };
  
  const monthlyRevenue = getMonthlyRevenue();

  // Inactive Leads (> 14 days)
  const inactiveLeads: InactiveLead[] = leads
    .filter(l => {
      const daysSince = differenceInDays(new Date(), new Date(l.updated_at));
      return daysSince > 14 && l.status !== 'closed';
    })
    .map(l => {
      const referrer = profiles.find(p => p.id === l.referrer_id);
      return {
        id: l.id,
        name: l.lead_name,
        email: null,
        daysSinceUpdate: differenceInDays(new Date(), new Date(l.updated_at)),
        status: l.status,
        referrerName: referrer?.full_name || referrer?.email || null,
      };
    })
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
    .slice(0, 10);

  const formatUSD = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M USD`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K USD`;
    }
    return `${value} USD`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* KPI Summary Cards - Real Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Publikované projekty"
            value={publishedProperties}
            subtitle={`z ${properties.length} celkem`}
            progress={properties.length > 0 ? Math.round((publishedProperties / properties.length) * 100) : 0}
            maxProgress={100}
            variant="green"
          />
          
          <StatCard
            title="Aktivní leady"
            value={totalLeads}
            subtitle={`${registrations.length} registrací`}
            progress={Math.min(totalLeads, 100)}
            maxProgress={100}
            variant="blue"
          />
          
          <StatCard
            title="Uzavření klienti"
            value={clientCount}
            subtitle={`${totalLeads > 0 ? ((clientCount / totalLeads) * 100).toFixed(1) : 0}% konverze`}
            progress={totalLeads > 0 ? Math.round((clientCount / totalLeads) * 100) : 0}
            maxProgress={100}
            variant="orange"
          />
          
          <StatCard
            title="Lokality"
            value={areas.length}
            subtitle={`${brochureRequests.length} žádostí o brožury`}
            progress={Math.min(areas.length * 10, 100)}
            maxProgress={100}
            variant="dark"
          />
        </div>

        {/* Revenue & Analytics Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Total Revenue Card */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-medium text-muted-foreground">Celkový obrat</CardTitle>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-2xl font-semibold text-foreground">{formatUSD(totalSalesUSD)}</span>
                  <span className="text-xs text-muted-foreground">minulý měsíc {formatUSD(lastMonthRevenue)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 ${revenueChange >= 0 ? 'text-crm-primary' : 'text-destructive'}`}>
                  {revenueChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-xs font-medium">{Math.abs(revenueChange).toFixed(1)}%</span>
                </div>
                <button className="p-1 hover:bg-muted rounded">
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatUSD(value), 'Obrat']}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="hsl(var(--crm-primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart - Area Interest */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground">Zájem podle oblastí</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">Počet projektů a žádostí o brožury podle lokalit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                {/* Legend */}
                <div className="space-y-3">
                  {areaInterest.slice(0, 4).map((item, index) => {
                    const colors = ['hsl(207, 90%, 54%)', 'hsl(152, 69%, 40%)', 'hsl(27, 98%, 54%)', 'hsl(220, 15%, 50%)'];
                    return (
                      <div key={item.area} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors[index] }}
                        />
                        <span className="text-sm text-muted-foreground">{item.area}</span>
                        <span className="text-sm font-medium ml-auto">{Math.round((item.total / areaInterest.reduce((a, b) => a + b.total, 0)) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pie Chart */}
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={areaInterest.slice(0, 4).map((item, index) => ({
                          ...item,
                          fill: ['hsl(207, 90%, 54%)', 'hsl(152, 69%, 40%)', 'hsl(27, 98%, 54%)', 'hsl(220, 15%, 50%)'][index]
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="total"
                      >
                        {areaInterest.slice(0, 4).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={['hsl(207, 90%, 54%)', 'hsl(152, 69%, 40%)', 'hsl(27, 98%, 54%)', 'hsl(220, 15%, 50%)'][index]} 
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inactive Leads Warning */}
        {inactiveLeads.length > 0 && (
          <Card className="border-admin-leads/50 bg-admin-leads-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-admin-leads">
                <AlertTriangle className="h-4 w-4" />
                Leady bez aktivity {">"} 14 dní
                <Badge variant="destructive" className="ml-2 text-xs">
                  {inactiveLeads.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Tyto leady vyžadují pozornost - zvažte přiřazení jinému obchodníkovi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {inactiveLeads.slice(0, 5).map((lead) => (
                  <div 
                    key={lead.id} 
                    className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-admin-leads/20 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-admin-leads" />
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.referrerName ? `Referrer: ${lead.referrerName}` : 'Bez referrera'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-admin-leads border-admin-leads/50">
                        {lead.daysSinceUpdate} dní
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: {lead.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Bars Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Progress Metrics - Real Data */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-5 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Žádosti o brožury</span>
                  <span className="text-xs text-muted-foreground">{brochureRequests.length} celkem</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-crm-accent-blue rounded-full" style={{ width: `${Math.min(brochureRequests.length * 2, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Registrace na akce</span>
                  <span className="text-xs text-muted-foreground">{registrations.length} účastníků</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-crm-accent-blue rounded-full" style={{ width: `${Math.min(registrations.length * 5, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Uzavřené obchody</span>
                  <span className="text-xs text-muted-foreground">{deals.length} dealů</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-crm-primary rounded-full" style={{ width: `${Math.min(deals.length * 10, 100)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card className="lg:col-span-2 bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-medium text-muted-foreground">Konverzní trychtýř</CardTitle>
                <CardDescription className="text-xs text-muted-foreground/70">Přechod leadů mezi fázemi</CardDescription>
              </div>
              <button className="p-1 hover:bg-muted rounded">
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={funnelData} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      width={80}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {funnelData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    {i < funnelData.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 ml-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Over Time & Leaderboard */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2 bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground">Měsíční obrat</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Vývoj uzavřených obchodů za posledních 6 měsíců
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--admin-deals))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--admin-deals))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatUSD(value), 'Obrat']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--admin-deals))"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-admin-deals" />
                Top Referreři
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Podle hodnoty uzavřených obchodů
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topReferrers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Zatím žádné uzavřené obchody</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topReferrers.map((referrer, index) => (
                    <div 
                      key={referrer.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={
                            index === 0 ? "bg-admin-deals text-background" :
                            index === 1 ? "bg-muted-foreground/50" :
                            index === 2 ? "bg-amber-700" :
                            "bg-muted"
                          }>
                            {referrer.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {index < 3 && (
                          <div className="absolute -top-1 -right-1">
                            <Medal className={`h-4 w-4 ${
                              index === 0 ? "text-admin-deals" :
                              index === 1 ? "text-gray-400" :
                              "text-amber-600"
                            }`} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{referrer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {referrer.closedDeals} obchodů
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-admin-deals">
                          {formatUSD(referrer.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
