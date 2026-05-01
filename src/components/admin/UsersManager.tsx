import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Users, Loader2, Save, Thermometer, Edit, X, Mail, KeyRound, Trash2, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const ALL_ROLES: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "senior_obchodnik", label: "Senior obchodník" },
  { value: "obchodnik", label: "Obchodník" },
  { value: "tipar", label: "Tipař" },
  { value: "influencer_coordinator", label: "Koordinátor" },
  { value: "host", label: "Host" },
  { value: "user", label: "Uživatel" },
];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  website: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  avatar_url: string | null;
  created_at: string;
  referrer_id: string | null;
  warmth_level: number | null;
  assigned_obchodnik_id: string | null;
}

interface TiparOption {
  id: string;
  email: string;
  full_name: string | null;
}

interface ObchodnikOption {
  id: string;
  email: string;
  full_name: string | null;
}

export const UsersManager = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tipari, setTipari] = useState<TiparOption[]>([]);
  const [obchodnici, setObchodnici] = useState<ObchodnikOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editedProfiles, setEditedProfiles] = useState<Record<string, Partial<Profile>>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Profile>>({});
  const [savingDialog, setSavingDialog] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [adminBusy, setAdminBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all profiles with all fields
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, bio, website, linkedin_url, instagram_url, facebook_url, twitter_url, avatar_url, created_at, referrer_id, warmth_level, assigned_obchodnik_id")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch tipari (users with tipar role)
      const { data: tiparRoles, error: tiparError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "tipar");

      if (tiparError) throw tiparError;

      const tiparIds = (tiparRoles || []).map(r => r.user_id);
      const tipariList = (profilesData || []).filter(p => tiparIds.includes(p.id));

      // Fetch obchodnici (users with obchodnik role)
      const { data: obchodnikRoles, error: obchodnikError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "obchodnik");

      if (obchodnikError) throw obchodnikError;

      const obchodnikIds = (obchodnikRoles || []).map(r => r.user_id);
      const obchodniciList = (profilesData || []).filter(p => obchodnikIds.includes(p.id));

      setProfiles(profilesData || []);
      setTipari(tipariList);
      setObchodnici(obchodniciList);
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

  const handleEditField = (profileId: string, field: keyof Profile, value: any) => {
    setEditedProfiles(prev => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        [field]: value === "none" ? null : value
      }
    }));
  };

  const saveProfile = async (profileId: string) => {
    const changes = editedProfiles[profileId];
    if (!changes) return;

    setSavingId(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(changes)
        .eq("id", profileId);

      if (error) throw error;

      toast({
        title: "Uloženo",
        description: "Změny byly úspěšně uloženy.",
      });

      // Clear edited state and refresh
      setEditedProfiles(prev => {
        const newState = { ...prev };
        delete newState[profileId];
        return newState;
      });
      
      fetchData();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Chyba při ukládání",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const openEditDialog = async (profile: Profile) => {
    setSelectedProfile(profile);
    setEditFormData({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      bio: profile.bio || "",
      website: profile.website || "",
      linkedin_url: profile.linkedin_url || "",
      instagram_url: profile.instagram_url || "",
      facebook_url: profile.facebook_url || "",
      twitter_url: profile.twitter_url || "",
      avatar_url: profile.avatar_url || "",
      referrer_id: profile.referrer_id,
      assigned_obchodnik_id: profile.assigned_obchodnik_id,
      warmth_level: profile.warmth_level ?? 50,
    });
    setEditEmail(profile.email);
    setNewPassword("");
    setEditDialogOpen(true);
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id);
    setEditRoles((rolesData || []).map((r: any) => r.role));
  };

  const callAdminAction = async (payload: Record<string, unknown>, busyKey: string, successMsg: string) => {
    if (!selectedProfile) return;
    setAdminBusy(busyKey);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { user_id: selectedProfile.id, ...payload },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Operace selhala");
      toast({ title: successMsg });
      return data;
    } catch (e: any) {
      toast({ title: "Chyba", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setAdminBusy(null);
    }
  };

  const handleUpdateEmail = async () => {
    if (!editEmail || editEmail === selectedProfile?.email) return;
    await callAdminAction({ action: "update_email", email: editEmail }, "email", "E-mail aktualizován");
    fetchData();
  };

  const handleResetPassword = async () => {
    const payload: Record<string, unknown> = { action: "reset_password" };
    if (newPassword) payload.new_password = newPassword;
    await callAdminAction(payload, "password", newPassword ? "Heslo nastaveno" : "Reset link odeslán");
    setNewPassword("");
  };

  const handleSaveRoles = async () => {
    await callAdminAction({ action: "set_roles", roles: editRoles }, "roles", "Role aktualizovány");
    fetchData();
  };

  const handleDeleteUser = async () => {
    await callAdminAction({ action: "delete_user" }, "delete", "Uživatel smazán");
    setDeleteOpen(false);
    setEditDialogOpen(false);
    fetchData();
  };

  const toggleRole = (role: string) => {
    setEditRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const saveDialogChanges = async () => {
    if (!selectedProfile) return;

    setSavingDialog(true);
    try {
      const updateData: Partial<Profile> = {
        full_name: editFormData.full_name || null,
        phone: editFormData.phone || null,
        bio: editFormData.bio || null,
        website: editFormData.website || null,
        linkedin_url: editFormData.linkedin_url || null,
        instagram_url: editFormData.instagram_url || null,
        facebook_url: editFormData.facebook_url || null,
        twitter_url: editFormData.twitter_url || null,
        avatar_url: editFormData.avatar_url || null,
        referrer_id: editFormData.referrer_id || null,
        assigned_obchodnik_id: editFormData.assigned_obchodnik_id || null,
        warmth_level: editFormData.warmth_level ?? 50,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", selectedProfile.id);

      if (error) throw error;

      toast({
        title: "Profil uložen",
        description: "Všechny změny byly úspěšně uloženy.",
      });

      setEditDialogOpen(false);
      setSelectedProfile(null);
      fetchData();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Chyba při ukládání",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingDialog(false);
    }
  };

  const getDisplayValue = (profileId: string, field: keyof Profile, originalValue: any) => {
    const edited = editedProfiles[profileId];
    if (edited && field in edited) {
      return edited[field];
    }
    return originalValue;
  };

  const hasChanges = (profileId: string) => {
    return !!editedProfiles[profileId] && Object.keys(editedProfiles[profileId]).length > 0;
  };

  const filteredProfiles = profiles.filter((profile) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        profile.email.toLowerCase().includes(query) ||
        (profile.full_name && profile.full_name.toLowerCase().includes(query)) ||
        (profile.phone && profile.phone.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const getProfileDisplayName = (id: string | null) => {
    if (!id) return null;
    const profile = profiles.find(p => p.id === id);
    return profile ? (profile.full_name || profile.email) : null;
  };

  const getWarmthColor = (level: number) => {
    if (level >= 80) return "text-red-500";
    if (level >= 60) return "text-orange-500";
    if (level >= 40) return "text-yellow-500";
    if (level >= 20) return "text-blue-400";
    return "text-blue-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Správa uživatelů
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/70">
                  Plná editace profilů, vazby a stupně ohřátí ({profiles.length} uživatelů)
                </CardDescription>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat podle emailu, jména nebo telefonu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Žádní uživatelé nenalezeni</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Uživatel</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Tipař</TableHead>
                    <TableHead>Obchodník</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const currentReferrerId = getDisplayValue(profile.id, "referrer_id", profile.referrer_id);
                    const currentObchodnikId = getDisplayValue(profile.id, "assigned_obchodnik_id", profile.assigned_obchodnik_id);
                    const currentWarmth = getDisplayValue(profile.id, "warmth_level", profile.warmth_level) ?? 50;

                    return (
                      <TableRow key={profile.id} className="border-border">
                        <TableCell>
                          <div>
                            <div className="font-medium">{profile.full_name || "—"}</div>
                            <div className="text-sm text-muted-foreground">{profile.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{profile.phone || "—"}</div>
                            <div className="text-muted-foreground text-xs">
                              {format(new Date(profile.created_at), "dd.MM.yyyy", { locale: cs })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentReferrerId || "none"}
                            onValueChange={(value) => handleEditField(profile.id, "referrer_id", value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Vybrat tipaře" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Žádný —</SelectItem>
                              {tipari
                                .filter(t => t.id !== profile.id)
                                .map((tipar) => (
                                  <SelectItem key={tipar.id} value={tipar.id}>
                                    {tipar.full_name || tipar.email}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentObchodnikId || "none"}
                            onValueChange={(value) => handleEditField(profile.id, "assigned_obchodnik_id", value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Vybrat obchodníka" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Žádný —</SelectItem>
                              {obchodnici
                                .filter(o => o.id !== profile.id)
                                .map((obchodnik) => (
                                  <SelectItem key={obchodnik.id} value={obchodnik.id}>
                                    {obchodnik.full_name || obchodnik.email}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(profile)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveProfile(profile.id)}
                              disabled={!hasChanges(profile.id) || savingId === profile.id}
                            >
                              {savingId === profile.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="">Editace profilu</DialogTitle>
            <DialogDescription>
              {selectedProfile?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Základní údaje</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Celé jméno</Label>
                  <Input
                    id="full_name"
                    value={editFormData.full_name || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Jan Novák"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={editFormData.phone || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+420 123 456 789"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio / Poznámka</Label>
                <Textarea
                  id="bio"
                  value={editFormData.bio || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Krátký popis nebo poznámka o kontaktu..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">URL avataru</Label>
                <Input
                  id="avatar_url"
                  value={editFormData.avatar_url || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Social & Web */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Web & Sociální sítě</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Web</Label>
                  <Input
                    id="website"
                    value={editFormData.website || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    value={editFormData.linkedin_url || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    value={editFormData.instagram_url || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook_url">Facebook</Label>
                  <Input
                    id="facebook_url"
                    value={editFormData.facebook_url || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, facebook_url: e.target.value }))}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter_url">Twitter/X</Label>
                  <Input
                    id="twitter_url"
                    value={editFormData.twitter_url || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, twitter_url: e.target.value }))}
                    placeholder="https://x.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Relationships */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Vazby</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Doporučitel (Tipař)</Label>
                  <Select
                    value={editFormData.referrer_id || "none"}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, referrer_id: value === "none" ? null : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vybrat tipaře" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Žádný —</SelectItem>
                      {tipari
                        .filter(t => t.id !== selectedProfile?.id)
                        .map((tipar) => (
                          <SelectItem key={tipar.id} value={tipar.id}>
                            {tipar.full_name || tipar.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Přidělený obchodník</Label>
                  <Select
                    value={editFormData.assigned_obchodnik_id || "none"}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, assigned_obchodnik_id: value === "none" ? null : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vybrat obchodníka" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Žádný —</SelectItem>
                      {obchodnici
                        .filter(o => o.id !== selectedProfile?.id)
                        .map((obchodnik) => (
                          <SelectItem key={obchodnik.id} value={obchodnik.id}>
                            {obchodnik.full_name || obchodnik.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Warmth Level */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Stupeň ohřátí</h3>
              <div className="flex items-center gap-4">
                <Thermometer className={`h-5 w-5 ${getWarmthColor(editFormData.warmth_level ?? 50)}`} />
                <Slider
                  value={[editFormData.warmth_level ?? 50]}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, warmth_level: value[0] }))}
                  max={100}
                  step={10}
                  className="flex-1"
                />
                <span className={`text-lg font-bold w-12 ${getWarmthColor(editFormData.warmth_level ?? 50)}`}>
                  {editFormData.warmth_level ?? 50}%
                </span>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="space-y-4 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Shield className="h-4 w-4" /> Admin akce
              </h3>

              {/* Email change */}
              <div className="space-y-2">
                <Label>E-mail (přihlašovací)</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUpdateEmail}
                    disabled={adminBusy === "email" || editEmail === selectedProfile?.email || !editEmail}
                  >
                    {adminBusy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-md border border-border">
                  {ALL_ROLES.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={editRoles.includes(r.value)}
                        onCheckedChange={() => toggleRole(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSaveRoles}
                  disabled={adminBusy === "roles"}
                >
                  {adminBusy === "roles" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Uložit role
                </Button>
              </div>

              {/* Password reset */}
              <div className="space-y-2">
                <Label>Heslo</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nové heslo (volitelné)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPassword}
                    disabled={adminBusy === "password"}
                  >
                    {adminBusy === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prázdné pole = odešle uživateli reset link na e-mail. Vyplněné = nastaví heslo přímo.
                </p>
              </div>

              {/* Delete user */}
              <div className="space-y-2">
                <Label className="text-destructive">Nebezpečná zóna</Label>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={adminBusy === "delete"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Smazat uživatele
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Zrušit
            </Button>
            <Button onClick={saveDialogChanges} disabled={savingDialog}>
              {savingDialog ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Uložit změny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Účet uživatele {selectedProfile?.email} bude trvale odstraněn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {adminBusy === "delete" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};