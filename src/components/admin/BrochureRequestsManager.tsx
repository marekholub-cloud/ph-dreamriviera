import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download, Search, UserPlus, RefreshCw, Filter, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

import type { Json } from "@/integrations/supabase/types";

interface BrochureRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  request_type: string;
  investment_type: string | null;
  budget: string | null;
  timeline: string | null;
  selected_brochures: Json | null;
  created_at: string;
  assigned_obchodnik_id: string | null;
  client_id: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  brochure_request: "Žádost o brožuru",
  catalog_request: "Katalog",
  presentation_download: "Prezentace",
  contact_form: "Kontaktní formulář",
  event_registration: "Registrace na akci",
};

const BrochureRequestsManager = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BrochureRequest[]>([]);
  const [obchodnici, setObchodnici] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BrochureRequest | null>(null);
  const [selectedObchodnik, setSelectedObchodnik] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch brochure requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("brochure_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch obchodníci (users with obchodnik role)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["obchodnik", "senior_obchodnik", "admin"]);

      if (rolesError) throw rolesError;

      const userIds = rolesData?.map((r) => r.user_id) || [];

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;
        setObchodnici(profilesData || []);
      }

      setRequests(requestsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        request.name.toLowerCase().includes(searchLower) ||
        request.email.toLowerCase().includes(searchLower) ||
        request.phone.toLowerCase().includes(searchLower);

      // Type filter
      const matchesType = typeFilter === "all" || request.request_type === typeFilter;

      // Date filter
      const requestDate = new Date(request.created_at);
      const matchesDateFrom = !dateFrom || requestDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || requestDate <= new Date(dateTo + "T23:59:59");

      // Assigned filter
      const matchesAssigned =
        assignedFilter === "all" ||
        (assignedFilter === "assigned" && request.assigned_obchodnik_id) ||
        (assignedFilter === "unassigned" && !request.assigned_obchodnik_id);

      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo && matchesAssigned;
    });
  }, [requests, searchQuery, typeFilter, dateFrom, dateTo, assignedFilter]);

  const uniqueRequestTypes = useMemo(() => {
    const types = new Set(requests.map((r) => r.request_type));
    return Array.from(types);
  }, [requests]);

  const handleAssign = async () => {
    if (!selectedRequest || !selectedObchodnik) return;

    try {
      const { error } = await supabase
        .from("brochure_requests")
        .update({ assigned_obchodnik_id: selectedObchodnik })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Úspěch",
        description: "Obchodník byl přiřazen",
      });

      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setSelectedObchodnik("");
      fetchData();
    } catch (error) {
      console.error("Error assigning obchodnik:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přiřadit obchodníka",
        variant: "destructive",
      });
    }
  };

  const handleUnassign = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("brochure_requests")
        .update({ assigned_obchodnik_id: null })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Úspěch",
        description: "Přiřazení bylo zrušeno",
      });

      fetchData();
    } catch (error) {
      console.error("Error unassigning:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se zrušit přiřazení",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Jméno",
      "Email",
      "Telefon",
      "Typ požadavku",
      "Typ investice",
      "Rozpočet",
      "Časový rámec",
      "Vybrané brožury",
      "Vytvořeno",
      "Přiřazený obchodník",
    ];

    const rows = filteredRequests.map((r) => {
      const obchodnik = obchodnici.find((o) => o.id === r.assigned_obchodnik_id);
      return [
        r.id,
        r.name,
        r.email,
        r.phone,
        REQUEST_TYPE_LABELS[r.request_type] || r.request_type,
        r.investment_type || "",
        r.budget || "",
        r.timeline || "",
        Array.isArray(r.selected_brochures) ? (r.selected_brochures as string[]).map(String).join(", ") : "",
        format(new Date(r.created_at), "dd.MM.yyyy HH:mm", { locale: cs }),
        obchodnik ? obchodnik.full_name || obchodnik.email : "",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";"))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `brochure-requests-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export dokončen",
      description: `Exportováno ${filteredRequests.length} záznamů`,
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setAssignedFilter("all");
  };

  const getObchodnikName = (id: string | null) => {
    if (!id) return null;
    const obchodnik = obchodnici.find((o) => o.id === id);
    return obchodnik ? obchodnik.full_name || obchodnik.email : "Neznámý";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Žádosti o brožury ({filteredRequests.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Obnovit
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat jméno, email, telefon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Typ požadavku" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                {uniqueRequestTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {REQUEST_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Od" />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Do" />
            </div>

            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Přiřazení" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny</SelectItem>
                <SelectItem value="assigned">Přiřazené</SelectItem>
                <SelectItem value="unassigned">Nepřiřazené</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || typeFilter !== "all" || dateFrom || dateTo || assignedFilter !== "all") && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Aktivní filtry:</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Vymazat vše
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Brožury</TableHead>
                  <TableHead>Přiřazeno</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Žádné záznamy k zobrazení
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(request.created_at), "dd.MM.yyyy", { locale: cs })}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "HH:mm", { locale: cs })}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{request.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{request.email}</div>
                        <div className="text-sm text-muted-foreground">{request.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                        </Badge>
                        {request.investment_type && (
                          <div className="text-xs text-muted-foreground mt-1">{request.investment_type}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {Array.isArray(request.selected_brochures) && request.selected_brochures.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(request.selected_brochures as string[]).slice(0, 2).map((b, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {String(b)}
                              </Badge>
                            ))}
                            {request.selected_brochures.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{request.selected_brochures.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {request.assigned_obchodnik_id ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-600">
                              {getObchodnikName(request.assigned_obchodnik_id)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUnassign(request.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Nepřiřazeno
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={assignDialogOpen && selectedRequest?.id === request.id}
                          onOpenChange={(open) => {
                            setAssignDialogOpen(open);
                            if (!open) {
                              setSelectedRequest(null);
                              setSelectedObchodnik("");
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setSelectedObchodnik(request.assigned_obchodnik_id || "");
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Přiřadit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Přiřadit obchodníka</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label className="text-sm font-medium">Klient</Label>
                                <p className="text-sm text-muted-foreground">{request.name}</p>
                                <p className="text-xs text-muted-foreground">{request.email}</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Obchodník</Label>
                                <Select value={selectedObchodnik} onValueChange={setSelectedObchodnik}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Vyberte obchodníka" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {obchodnici.map((o) => (
                                      <SelectItem key={o.id} value={o.id}>
                                        {o.full_name || o.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={handleAssign} className="w-full" disabled={!selectedObchodnik}>
                                Přiřadit
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Zobrazeno {filteredRequests.length} z {requests.length} záznamů
            </div>
            <div>
              Nepřiřazeno: {requests.filter((r) => !r.assigned_obchodnik_id).length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrochureRequestsManager;
