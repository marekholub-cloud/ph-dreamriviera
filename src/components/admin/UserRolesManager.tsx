import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Trash2, Shield, Loader2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserRegistrationManager } from "@/components/admin/UserRegistrationManager";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  affiliate_code: string | null;
  created_at: string;
  roles: AppRole[];
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string | null;
}

export const UserRolesManager = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");
  const [addingRoleUserId, setAddingRoleUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, affiliate_code, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = (profilesData || []).map((profile) => {
        const userRoles = (rolesData || [])
          .filter((role: UserRole) => role.user_id === profile.id)
          .map((role: UserRole) => role.role);
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          affiliate_code: profile.affiliate_code,
          created_at: profile.created_at,
          roles: userRoles,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Chyba při načítání uživatelů",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (userId: string, role: AppRole) => {
    setAddingRoleUserId(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Role již existuje",
            description: "Uživatel již má tuto roli přiřazenu.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Auto-generate affiliate code for tipar and obchodnik roles
      if (role === "tipar" || role === "obchodnik") {
        // Check if user already has an affiliate code
        const { data: profile } = await supabase
          .from("profiles")
          .select("affiliate_code")
          .eq("id", userId)
          .single();

        if (!profile?.affiliate_code) {
          // Generate new affiliate code
          const { data: newCode } = await supabase.rpc("generate_affiliate_code");
          if (newCode) {
            await supabase
              .from("profiles")
              .update({ affiliate_code: newCode })
              .eq("id", userId);
            
            toast({
              title: "Affiliate kód vygenerován",
              description: `Uživateli byl automaticky přiřazen affiliate kód: ${newCode}`,
            });
          }
        }
      }

      toast({
        title: "Role přidána",
        description: `Role "${getRoleLabel(role)}" byla úspěšně přidána.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error adding role:", error);
      toast({
        title: "Chyba při přidávání role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingRoleUserId(null);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      toast({
        title: "Role odebrána",
        description: `Role "${role}" byla úspěšně odebrána.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Chyba při odebírání role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return user.email.toLowerCase().includes(query);
    }
    return true;
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "obchodnik":
      case "senior_obchodnik":
        return "default";
      case "tipar":
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "obchodnik":
        return "Obchodník";
      case "senior_obchodnik":
        return "Senior obchodník";
      case "tipar":
        return "Tipař";
      case "influencer_coordinator":
        return "Koordinátor";
      case "moderator":
        return "Správce";
      case "host":
        return "Hostitel";
      case "guest":
        return "Host";
      case "user":
        return "Host";
      default:
        return role;
    }
  };

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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Správa uživatelských rolí
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Celkem {users.length} registrovaných uživatelů
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Vytvořit uživatele
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nový uživatel</DialogTitle>
                </DialogHeader>
                <UserRegistrationManager onCreated={fetchUsers} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat podle emailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Žádní uživatelé nenalezeni</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Uživatel</TableHead>
                  <TableHead>Affiliate kód</TableHead>
                  <TableHead>Registrace</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-border">
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name || "—"}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.affiliate_code ? (
                        <code className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-mono">
                          {user.affiliate_code}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd.MM.yyyy", { locale: cs })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="flex items-center gap-1"
                            >
                              {getRoleLabel(role)}
                              <button
                                onClick={() => removeRole(user.id, role)}
                                className="ml-1 hover:text-destructive-foreground"
                                title="Odebrat roli"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Bez role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => setSelectedRole(value as AppRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Správce</SelectItem>
                            <SelectItem value="host">Hostitel</SelectItem>
                            <SelectItem value="guest">Host</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => addRole(user.id, selectedRole)}
                          disabled={addingRoleUserId === user.id || user.roles.includes(selectedRole)}
                        >
                          {addingRoleUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
