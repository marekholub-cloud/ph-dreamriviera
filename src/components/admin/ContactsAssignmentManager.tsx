import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ObchodnikProfileCard } from "./ObchodnikProfileCard";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
  assigned_obchodnik_id: string | null;
}

interface BrochureRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  request_type: string;
  created_at: string;
  assigned_obchodnik_id: string | null;
}

interface ObchodnikOption {
  id: string;
  email: string;
  full_name: string | null;
}

export const ContactsAssignmentManager = () => {
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [brochureRequests, setBrochureRequests] = useState<BrochureRequest[]>([]);
  const [obchodnici, setObchodnici] = useState<ObchodnikOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("contacts");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (contactsError) throw contactsError;

      const { data: brochureData, error: brochureError } = await supabase
        .from("brochure_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (brochureError) throw brochureError;

      const { data: obchodnikRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "obchodnik");

      if (rolesError) throw rolesError;

      const obchodnikIds = (obchodnikRoles || []).map(r => r.user_id);

      if (obchodnikIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", obchodnikIds);

        if (profilesError) throw profilesError;
        setObchodnici(profilesData || []);
      }

      setContacts(contactsData || []);
      setBrochureRequests(brochureData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Chyba při načítání dat",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignObchodnikToContact = async (contactId: string, obchodnikId: string | null) => {
    setSavingId(contactId);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ assigned_obchodnik_id: obchodnikId === "none" ? null : obchodnikId })
        .eq("id", contactId);

      if (error) throw error;

      setContacts(prev => prev.map(c => 
        c.id === contactId 
          ? { ...c, assigned_obchodnik_id: obchodnikId === "none" ? null : obchodnikId }
          : c
      ));

      toast({
        title: "Přiřazeno",
        description: "Obchodník byl úspěšně přiřazen.",
      });
    } catch (error: any) {
      console.error("Error assigning obchodnik:", error);
      toast({
        title: "Chyba při přiřazování",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const assignObchodnikToBrochure = async (requestId: string, obchodnikId: string | null) => {
    setSavingId(requestId);
    try {
      const { error } = await supabase
        .from("brochure_requests")
        .update({ assigned_obchodnik_id: obchodnikId === "none" ? null : obchodnikId })
        .eq("id", requestId);

      if (error) throw error;

      setBrochureRequests(prev => prev.map(r => 
        r.id === requestId 
          ? { ...r, assigned_obchodnik_id: obchodnikId === "none" ? null : obchodnikId }
          : r
      ));

      toast({
        title: "Přiřazeno",
        description: "Obchodník byl úspěšně přiřazen k požadavku.",
      });
    } catch (error: any) {
      console.error("Error assigning obchodnik:", error);
      toast({
        title: "Chyba při přiřazování",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.message.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredBrochureRequests = brochureRequests.filter((request) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.name.toLowerCase().includes(query) ||
        request.email.toLowerCase().includes(query) ||
        request.request_type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium text-muted-foreground">
                Přiřazení obchodníků
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                {contacts.length} kontaktů, {brochureRequests.length} požadavků na brožury
              </CardDescription>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Kontakty ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="brochures" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Brožury ({brochureRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Žádné kontakty nenalezeny</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Zpráva</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Přiřazený obchodník</TableHead>
                      <TableHead>Přiřadit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id} className="border-border">
                        <TableCell>
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-sm text-muted-foreground">{contact.email}</div>
                            {contact.phone && (
                              <div className="text-sm text-muted-foreground">{contact.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                            {contact.message}
                          </p>
                        </TableCell>
                        <TableCell>
                          {format(new Date(contact.created_at), "dd.MM.yyyy HH:mm", { locale: cs })}
                        </TableCell>
                        <TableCell>
                          <ObchodnikProfileCard obchodnikId={contact.assigned_obchodnik_id} size="md" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={contact.assigned_obchodnik_id || "none"}
                              onValueChange={(value) => assignObchodnikToContact(contact.id, value)}
                              disabled={savingId === contact.id}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Vybrat" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Žádný —</SelectItem>
                                {obchodnici.map((obchodnik) => (
                                  <SelectItem key={obchodnik.id} value={obchodnik.id}>
                                    {obchodnik.full_name || obchodnik.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {savingId === contact.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="brochures">
            {filteredBrochureRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Žádné požadavky na brožury nenalezeny</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Typ požadavku</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Přiřazený obchodník</TableHead>
                      <TableHead>Přiřadit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrochureRequests.map((request) => (
                      <TableRow key={request.id} className="border-border">
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.name}</div>
                            <div className="text-sm text-muted-foreground">{request.email}</div>
                            {request.phone && (
                              <div className="text-sm text-muted-foreground">{request.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{request.request_type}</span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), "dd.MM.yyyy HH:mm", { locale: cs })}
                        </TableCell>
                        <TableCell>
                          <ObchodnikProfileCard obchodnikId={request.assigned_obchodnik_id} size="md" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={request.assigned_obchodnik_id || "none"}
                              onValueChange={(value) => assignObchodnikToBrochure(request.id, value)}
                              disabled={savingId === request.id}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Vybrat" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Žádný —</SelectItem>
                                {obchodnici.map((obchodnik) => (
                                  <SelectItem key={obchodnik.id} value={obchodnik.id}>
                                    {obchodnik.full_name || obchodnik.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {savingId === request.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
