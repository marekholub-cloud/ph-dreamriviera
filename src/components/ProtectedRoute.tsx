import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert, Mail, MessageSquare, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireRoles?: AppRole[];
  requireAnyRole?: AppRole[];
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  requireRoles,
  requireAnyRole
}: ProtectedRouteProps) => {
  const { user, isAdmin, hasRole, hasAnyRole, loading, adminLoading, isTipar, isObchodnik, isSeniorObchodnik, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    email_verified: boolean;
    phone_verified: boolean;
  } | null>(null);

  // Check if tipar user needs verification
  useEffect(() => {
    const checkVerification = async () => {
      if (!user || adminLoading) return;
      
      // Only check for tipar role users who aren't also obchodnik/admin
      const isTiparOnly = isTipar && !isObchodnik && !isSeniorObchodnik && !isAdmin;
      
      if (isTiparOnly) {
        const { data } = await supabase
          .from("profiles")
          .select("email_verified, phone_verified")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setVerificationStatus(data);
          if (!data.email_verified || !data.phone_verified) {
            setNeedsVerification(true);
          }
        }
      }
      
      setVerificationChecked(true);
    };

    if (user && !adminLoading) {
      checkVerification();
    }
  }, [user, adminLoading, isTipar, isObchodnik, isSeniorObchodnik, isAdmin]);

  // Wait for both auth loading and admin role check
  if (loading || (user && adminLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Wait for verification check for tipar users
  const isTiparOnly = isTipar && !isObchodnik && !isSeniorObchodnik && !isAdmin;
  if (isTiparOnly && !verificationChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Show verification required screen for unverified tipar users
  if (isTiparOnly && needsVerification && location.pathname !== "/tipar-verification") {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center px-6">
        <Card className="max-w-md w-full bg-background">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-serif">Vyžadováno ověření</CardTitle>
            <CardDescription>
              Pro přístup k dashboardu je nutné ověřit váš účet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verification status */}
            <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium text-foreground">Stav ověření:</p>
              <div className="flex items-center gap-3">
                <Mail className={`h-4 w-4 ${verificationStatus?.email_verified ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="text-sm">
                  Email: {verificationStatus?.email_verified ? (
                    <span className="text-green-500">Ověřeno</span>
                  ) : (
                    <span className="text-amber-500">Čeká na ověření</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className={`h-4 w-4 ${verificationStatus?.phone_verified ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="text-sm">
                  WhatsApp: {verificationStatus?.phone_verified ? (
                    <span className="text-green-500">Ověřeno</span>
                  ) : (
                    <span className="text-amber-500">Čeká na ověření</span>
                  )}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <Button 
                className="w-full" 
                onClick={() => navigate("/tipar-verification")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Pokračovat k ověření
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Odhlásit se
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center px-6">
        <Card className="max-w-md w-full bg-background">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-serif">Přístup odepřen</CardTitle>
            <CardDescription>
              Nemáte oprávnění k přístupu do admin panelu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Tato sekce je dostupná pouze pro administrátory. Pokud si myslíte, že byste měli mít přístup, kontaktujte správce systému.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/")}
              >
                Zpět na hlavní stránku
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Odhlásit se
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for specific roles (all must match)
  if (requireRoles && requireRoles.length > 0) {
    const hasAllRoles = requireRoles.every(role => hasRole(role));
    if (!hasAllRoles) {
      return (
        <div className="min-h-screen bg-card flex items-center justify-center px-6">
          <Card className="max-w-md w-full bg-background">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-serif">Přístup odepřen</CardTitle>
              <CardDescription>
                Nemáte požadovaná oprávnění pro přístup k této stránce
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Pro přístup k této sekci potřebujete speciální oprávnění. Kontaktujte správce systému pro více informací.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Zpět na hlavní stránku
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Odhlásit se
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Check for any of the specified roles
  if (requireAnyRole && requireAnyRole.length > 0) {
    if (!hasAnyRole(requireAnyRole)) {
      return (
        <div className="min-h-screen bg-card flex items-center justify-center px-6">
          <Card className="max-w-md w-full bg-background">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-serif">Přístup odepřen</CardTitle>
              <CardDescription>
                Nemáte potřebnou roli pro přístup k dashboardu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Pro přístup k dashboardu je vyžadována jedna z následujících rolí: tipař, obchodník, senior obchodník nebo admin. Pokud chcete získat přístup, zaregistrujte se do programu.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Zpět na hlavní stránku
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Odhlásit se
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
