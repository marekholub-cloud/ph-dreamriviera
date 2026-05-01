import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2, Eye, EyeOff, Mail, User, Phone, Shield, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleOption {
  value: AppRole;
  label: string;
  description: string;
  color: string;
}

const roleOptions: RoleOption[] = [
  { value: "admin", label: "Admin", description: "Plný přístup ke všem funkcím", color: "bg-red-500" },
  { value: "moderator", label: "Správce", description: "Moderace obsahu a správa", color: "bg-cyan-500" },
  { value: "host", label: "Hostitel", description: "Správa vlastních pronájmů", color: "bg-pink-500" },
  { value: "guest", label: "Host", description: "Základní přístup pro návštěvníky", color: "bg-gray-500" },
];

interface UserRegistrationManagerProps {
  onCreated?: () => void;
}

export const UserRegistrationManager = ({ onCreated }: UserRegistrationManagerProps = {}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{ email: string; roles: string[] }>>([]);

  const toggleRole = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let generatedPassword = "";
    for (let i = 0; i < 12; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generatedPassword);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Chyba",
        description: "Email a heslo jsou povinné.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Chyba",
        description: "Heslo musí mít alespoň 6 znaků.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Nejste přihlášeni");
      }

      const response = await supabase.functions.invoke("admin-register-user", {
        body: {
          email,
          password,
          full_name: fullName || undefined,
          phone: phone || undefined,
          roles: selectedRoles,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Nepodařilo se vytvořit uživatele");
      }

      toast({
        title: "Uživatel vytvořen",
        description: `Uživatel ${email} byl úspěšně zaregistrován.`,
      });

      // Add to recent registrations
      setRegisteredUsers((prev) => [
        { email, roles: selectedRoles },
        ...prev.slice(0, 4),
      ]);

      // Reset form
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setSelectedRoles([]);

      // Notify parent to refresh data
      onCreated?.();
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Chyba při registraci",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return roleOptions.find((r) => r.value === role)?.label || role;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Registration Form */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Registrace nového uživatele
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground/70">
            Vytvořte nový účet s přiřazenými rolemi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="uživatel@example.com"
                className="bg-card"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Heslo *
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimálně 6 znaků"
                    className="bg-card pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generovat
                </Button>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Celé jméno
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jan Novák"
                className="bg-card"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefon
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+420 123 456 789"
                className="bg-card"
              />
            </div>

            {/* Roles */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <div className="grid gap-3">
                {roleOptions.map((role) => (
                  <label
                    key={role.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRoles.includes(role.value)
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-muted-foreground/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{role.label}</div>
                      <div className="text-xs text-muted-foreground/70">{role.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vytvářím účet...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Vytvořit účet
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Registrations */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Nedávno registrovaní
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground/70">
            Posledních 5 vytvořených účtů v této relaci
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registeredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Zatím nebyli registrováni žádní uživatelé</p>
              <p className="text-sm mt-1">Vytvořte prvního uživatele pomocí formuláře vlevo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {registeredUsers.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                >
                  <div>
                    <div className="text-sm font-medium">{user.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span
                            key={role}
                            className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                          >
                            {getRoleLabel(role)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Bez role</span>
                      )}
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
