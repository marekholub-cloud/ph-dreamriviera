import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MousePointer, MousePointerClick, Users, TrendingUp, RefreshCw, Eye, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AffiliateStats {
  referrer_id: string;
  affiliate_code: string;
  referrer_name: string | null;
  referrer_email: string;
  total_clicks: number;
  first_clicks: number;
  repeat_clicks: number;
  leads_count: number;
  conversion_rate: number;
}

interface ClickHistoryItem {
  id: string;
  affiliate_code: string;
  clicked_at: string;
  page_url: string | null;
  was_first_click: boolean;
  ip_address: string | null;
}

interface LeadClickHistory {
  lead_id: string;
  lead_name: string;
  email: string | null;
  affiliate_code: string | null;
  click_history: Array<{
    code: string;
    timestamp: string;
    page_url?: string;
    was_first?: boolean;
  }>;
  created_at: string;
}

export function AffiliateAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AffiliateStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);
  const [clickHistory, setClickHistory] = useState<ClickHistoryItem[]>([]);
  const [leadsWithHistory, setLeadsWithHistory] = useState<LeadClickHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch profiles with affiliate codes
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, affiliate_code, full_name, email")
        .not("affiliate_code", "is", null);

      if (profilesError) throw profilesError;

      // Fetch all affiliate clicks
      const { data: clicks, error: clicksError } = await supabase
        .from("affiliate_clicks")
        .select("referrer_id, affiliate_code, was_first_click");

      if (clicksError) throw clicksError;

      // Fetch leads count per referrer
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("referrer_id, affiliate_code");

      if (leadsError) throw leadsError;

      // Calculate stats per referrer
      const statsMap = new Map<string, AffiliateStats>();

      profiles?.forEach((profile) => {
        if (profile.affiliate_code) {
          statsMap.set(profile.id, {
            referrer_id: profile.id,
            affiliate_code: profile.affiliate_code,
            referrer_name: profile.full_name,
            referrer_email: profile.email,
            total_clicks: 0,
            first_clicks: 0,
            repeat_clicks: 0,
            leads_count: 0,
            conversion_rate: 0,
          });
        }
      });

      // Count clicks
      clicks?.forEach((click) => {
        if (click.referrer_id && statsMap.has(click.referrer_id)) {
          const stat = statsMap.get(click.referrer_id)!;
          stat.total_clicks++;
          if (click.was_first_click) {
            stat.first_clicks++;
          } else {
            stat.repeat_clicks++;
          }
        }
      });

      // Count leads
      leads?.forEach((lead) => {
        if (lead.referrer_id && statsMap.has(lead.referrer_id)) {
          const stat = statsMap.get(lead.referrer_id)!;
          stat.leads_count++;
        }
      });

      // Calculate conversion rates
      statsMap.forEach((stat) => {
        if (stat.first_clicks > 0) {
          stat.conversion_rate = (stat.leads_count / stat.first_clicks) * 100;
        }
      });

      // Sort by total clicks descending
      const sortedStats = Array.from(statsMap.values()).sort(
        (a, b) => b.total_clicks - a.total_clicks
      );

      setStats(sortedStats);
    } catch (error: any) {
      console.error("Error fetching affiliate stats:", error);
      toast({
        title: "Chyba při načítání statistik",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClickHistory = async (referrerId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("affiliate_clicks")
        .select("id, affiliate_code, clicked_at, page_url, was_first_click, ip_address")
        .eq("referrer_id", referrerId)
        .order("clicked_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setClickHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching click history:", error);
      toast({
        title: "Chyba při načítání historie",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchLeadsWithHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, lead_name, email, affiliate_code, click_history, created_at")
        .not("click_history", "eq", "[]")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const mapped: LeadClickHistory[] = (data || []).map((lead) => {
        // Parse click_history from JSON
        let parsedHistory: LeadClickHistory['click_history'] = [];
        if (Array.isArray(lead.click_history)) {
          parsedHistory = lead.click_history.map((item: unknown) => {
            const obj = item as Record<string, unknown>;
            return {
              code: String(obj.code || ''),
              timestamp: String(obj.timestamp || ''),
              page_url: obj.page_url ? String(obj.page_url) : undefined,
              was_first: Boolean(obj.was_first),
            };
          });
        }
        
        return {
          lead_id: lead.id,
          lead_name: lead.lead_name,
          email: lead.email,
          affiliate_code: lead.affiliate_code,
          click_history: parsedHistory,
          created_at: lead.created_at,
        };
      });
      
      setLeadsWithHistory(mapped);
    } catch (error: any) {
      console.error("Error fetching leads with history:", error);
      toast({
        title: "Chyba při načítání leadů",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredStats = stats.filter((stat) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      stat.affiliate_code.toLowerCase().includes(query) ||
      stat.referrer_email.toLowerCase().includes(query) ||
      (stat.referrer_name && stat.referrer_name.toLowerCase().includes(query))
    );
  });

  // Summary totals
  const totals = stats.reduce(
    (acc, stat) => ({
      clicks: acc.clicks + stat.total_clicks,
      firstClicks: acc.firstClicks + stat.first_clicks,
      repeatClicks: acc.repeatClicks + stat.repeat_clicks,
      leads: acc.leads + stat.leads_count,
    }),
    { clicks: 0, firstClicks: 0, repeatClicks: 0, leads: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-admin-stats" />
              Celkem kliků
            </CardDescription>
            <CardTitle className="text-xl font-semibold text-admin-stats">
              {totals.clicks.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-emerald-500" />
              First Clicks
            </CardDescription>
            <CardTitle className="text-xl font-semibold text-emerald-500">
              {totals.firstClicks.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-500" />
              Opakované kliky
            </CardDescription>
            <CardTitle className="text-3xl text-amber-500">
              {totals.repeatClicks.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-admin-leads/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4 text-admin-leads" />
              Leady z affiliate
            </CardDescription>
            <CardTitle className="text-3xl text-admin-leads">
              {totals.leads.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Referrers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="">Affiliate statistiky tipařů</CardTitle>
              <CardDescription>
                Přehled kliků a konverzí pro každého tipaře
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat tipaře..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchStats}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Tipař</TableHead>
                  <TableHead>Affiliate kód</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
                  <TableHead className="text-right">First Clicks</TableHead>
                  <TableHead className="text-right">Opakované</TableHead>
                  <TableHead className="text-right">Leady</TableHead>
                  <TableHead className="text-right">Konverze</TableHead>
                  <TableHead className="text-center">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Žádná data k zobrazení
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStats.map((stat) => (
                    <TableRow key={stat.referrer_id} className="border-border">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {stat.referrer_name || "Bez jména"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stat.referrer_email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {stat.affiliate_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {stat.total_clicks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-emerald-500 font-medium">
                          {stat.first_clicks.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-amber-500">
                          {stat.repeat_clicks.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {stat.leads_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.conversion_rate > 0 ? (
                          <Badge
                            variant="secondary"
                            className={
                              stat.conversion_rate > 10
                                ? "bg-emerald-500/20 text-emerald-500"
                                : stat.conversion_rate > 5
                                ? "bg-amber-500/20 text-amber-500"
                                : ""
                            }
                          >
                            {stat.conversion_rate.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReferrer(stat.referrer_id);
                                fetchClickHistory(stat.referrer_id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Historie kliků: {stat.referrer_name || stat.affiliate_code}
                              </DialogTitle>
                              <DialogDescription>
                                Posledních 100 kliknutí na affiliate odkaz
                              </DialogDescription>
                            </DialogHeader>
                            {loadingHistory ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            ) : (
                              <ScrollArea className="h-[400px]">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Datum</TableHead>
                                      <TableHead>Typ</TableHead>
                                      <TableHead>Stránka</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {clickHistory.map((click) => (
                                      <TableRow key={click.id}>
                                        <TableCell className="text-sm">
                                          {format(
                                            new Date(click.clicked_at),
                                            "d. MMM yyyy HH:mm",
                                            { locale: cs }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {click.was_first_click ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-500">
                                              First Click
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary">
                                              Opakovaný
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                                          {click.page_url || "-"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </ScrollArea>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Leads with Click History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="">Leady s historií kliků</CardTitle>
              <CardDescription>
                Kontakty s více affiliate kódy v historii - možnost přiřadit jiného doporučitele
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchLeadsWithHistory}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Načíst historii
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leadsWithHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MousePointer className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Klikněte na "Načíst historii" pro zobrazení leadů s více affiliate kódy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Lead</TableHead>
                    <TableHead>Aktuální kód</TableHead>
                    <TableHead>Historie kódů</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsWithHistory.map((lead) => (
                    <TableRow key={lead.lead_id} className="border-border">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{lead.lead_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {lead.email || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.affiliate_code ? (
                          <Badge variant="outline" className="font-mono">
                            {lead.affiliate_code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.click_history.map((click, idx) => (
                            <Badge
                              key={idx}
                              variant={click.was_first ? "default" : "secondary"}
                              className="text-xs font-mono"
                              title={`${click.timestamp}${click.page_url ? ` - ${click.page_url}` : ""}`}
                            >
                              {click.code}
                              {click.was_first && " ★"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), "d. MMM yyyy", { locale: cs })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}